import { allocate, generateCombinations } from './candidates';
import { rankCombination, rankingModelInfo } from './ranking';
import {
  BuyerOrder,
  CostBreakdown,
  FarmEvaluation,
  Harvest,
  MatchPlan,
  RankedCombination,
  SelectedLot,
} from './types';

/**
 * Hybrid matching pipeline:
 *
 *   buyer order
 *     -> STEP 1  deterministic feasibility filter   (evaluateHarvest — rules only)
 *     -> STEP 2  candidate combination generation   (candidates.ts — rules only)
 *     -> STEP 3  ML ranking of feasible candidates  (ranking.ts — logistic regression)
 *     -> top 3 recommended combinations, best one becomes the supply plan
 *
 * Hard constraints live exclusively in steps 1-2. The ML model never sees an
 * infeasible option and can never admit one; it only orders feasible ones.
 */

const normalise = (value: string) => value.trim().toLowerCase();

export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const radius = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLatitude = toRadians(b.latitude - a.latitude);
  const dLongitude = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);
  const h =
    Math.sin(dLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(dLongitude / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function evaluateHarvest(harvest: Harvest, order: BuyerOrder): FarmEvaluation {
  const reasons: string[] = [];
  const distance = distanceKm(harvest.coordinates, order.coordinates);

  if (normalise(harvest.crop) !== normalise(order.crop)) {
    reasons.push(`Crop is ${harvest.crop}, not ${order.crop}`);
  }
  if (order.variety && normalise(harvest.variety) !== normalise(order.variety)) {
    reasons.push(`Variety is ${harvest.variety}`);
  }

  // Condition is seller-provided: it gates matching, and the buyer can ask the
  // seller about the details in chat before confirming.
  const conditionRank: Record<string, number> = { Economy: 1, Standard: 2, Premium: 3 };
  const requiredRank = order.minimumCondition === 'Any' ? 0 : conditionRank[order.minimumCondition];
  if (conditionRank[harvest.condition] < requiredRank) {
    reasons.push(
      `Condition is ${harvest.condition.toLowerCase()}, buyer needs ${order.minimumCondition.toLowerCase()} or better`,
    );
  }

  if (harvest.harvestDate > order.deliveryDate) {
    reasons.push('Harvest is not ready before delivery');
  }

  const conditionScore = { Economy: 66, Standard: 79, Premium: 92 }[harvest.condition];
  const distanceScore = Math.max(0, 100 - distance / 5);
  const score = conditionScore * 0.45 + harvest.reliability * 0.35 + distanceScore * 0.2;

  return {
    harvest,
    eligible: reasons.length === 0,
    score: Math.round(score),
    distanceKm: Math.round(distance),
    reasons,
  };
}

function calculateCosts(selected: SelectedLot[], fulfilledKg: number): CostBreakdown {
  if (fulfilledKg === 0) {
    return {
      produce: 0,
      dispatch: 0,
      distance: 0,
      coldChain: 0,
      handling: 0,
      qualityTesting: 0,
      platform: 0,
      total: 0,
      deliveredPerKg: 0,
      routeKm: 0,
      trucks: 0,
    };
  }

  const distances = selected.map((lot) => lot.distanceKm);
  const farthest = Math.max(...distances);
  const distanceSum = distances.reduce((sum, value) => sum + value, 0);
  const routeKm = Math.round(farthest * 2 + Math.max(0, distanceSum - farthest) * 0.35);
  const trucks = Math.ceil(fulfilledKg / 12000);
  const produce = selected.reduce(
    (sum, lot) => sum + lot.allocatedKg * lot.harvest.minimumPricePerKg,
    0,
  );
  const dispatch = trucks * 220;
  const distance = routeKm * 1.65;
  const coldChain = fulfilledKg * 0.11;
  const handling = fulfilledKg * 0.08;
  const qualityTesting = selected.length * 45;
  const subtotal = produce + dispatch + distance + coldChain + handling + qualityTesting;
  const platform = subtotal * 0.025;
  const total = subtotal + platform;

  return {
    produce,
    dispatch,
    distance,
    coldChain,
    handling,
    qualityTesting,
    platform,
    total,
    deliveredPerKg: total / fulfilledKg,
    routeKm,
    trucks,
  };
}

function rankFeasibleCombinations(
  order: BuyerOrder,
  eligible: FarmEvaluation[],
): RankedCombination[] {
  const combinations = generateCombinations(order, eligible);

  const ranked = combinations.map((combination) => {
    const lots = allocate(order, combination);
    const fulfilledKg = lots.reduce((sum, lot) => sum + lot.allocatedKg, 0);
    const cost = calculateCosts(lots, fulfilledKg);
    const withinBudget = cost.deliveredPerKg <= order.maximumDeliveredPricePerKg;
    return rankCombination(order, lots, cost, withinBudget);
  });

  // The buyer's price ceiling is a hard constraint: over-budget combinations
  // only surface when nothing affordable exists, and stay flagged in the UI.
  const affordable = ranked.filter((combination) => combination.withinBudget);
  const pool = affordable.length > 0 ? affordable : ranked;

  return pool
    .sort(
      (a, b) =>
        b.finalScore - a.finalScore ||
        a.cost.deliveredPerKg - b.cost.deliveredPerKg ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 3)
    .map((combination, index) => ({ ...combination, rank: index + 1 }));
}

/** Old greedy fill, kept as the fallback when total supply cannot cover the order. */
function greedyPartialSelection(order: BuyerOrder, eligible: FarmEvaluation[]) {
  let remaining = order.quantityKg;
  const selected: SelectedLot[] = [];
  const eligibleNotNeeded: FarmEvaluation[] = [];

  for (const evaluation of eligible) {
    if (remaining <= 0) {
      eligibleNotNeeded.push(evaluation);
      continue;
    }
    const allocatedKg = Math.min(remaining, evaluation.harvest.quantityKg);
    selected.push({ ...evaluation, allocatedKg });
    remaining -= allocatedKg;
  }

  return { selected, eligibleNotNeeded };
}

export function buildMatchPlan(
  order: BuyerOrder,
  harvests: Harvest[],
  preferredCombinationId?: string | null,
): MatchPlan {
  // STEP 1 — deterministic feasibility filter (hard rules, no ML).
  const evaluations = harvests.map((harvest) => evaluateHarvest(harvest, order));
  const eligible = evaluations
    .filter((evaluation) => evaluation.eligible)
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
  const rejected = evaluations.filter((evaluation) => !evaluation.eligible);

  // STEPS 2-3 — candidate combinations, then ML ranking of feasible ones.
  // The AI pick (#1) is the default, but the buyer can build the plan from
  // any ranked combination — all of them already passed every hard rule.
  const rankedCombinations = rankFeasibleCombinations(order, eligible);
  const winner =
    rankedCombinations.find((combination) => combination.id === preferredCombinationId) ??
    rankedCombinations[0];

  const { selected, eligibleNotNeeded } = winner
    ? {
        selected: winner.lots,
        eligibleNotNeeded: eligible.filter(
          (evaluation) =>
            !winner.lots.some((lot) => lot.harvest.id === evaluation.harvest.id),
        ),
      }
    : greedyPartialSelection(order, eligible);

  const fulfilledKg = selected.reduce((sum, lot) => sum + lot.allocatedKg, 0);
  const cost = winner ? winner.cost : calculateCosts(selected, fulfilledKg);

  return {
    order,
    selected,
    rejected,
    eligibleNotNeeded,
    requestedKg: order.quantityKg,
    fulfilledKg,
    fillRate: order.quantityKg ? Math.min(1, fulfilledKg / order.quantityKg) : 0,
    cost,
    withinBudget:
      fulfilledKg >= order.quantityKg &&
      cost.deliveredPerKg <= order.maximumDeliveredPricePerKg,
    rankedCombinations,
    selectedCombinationId: winner ? winner.id : null,
    modelInfo: rankingModelInfo(),
    createdAt: new Date().toISOString(),
  };
}

