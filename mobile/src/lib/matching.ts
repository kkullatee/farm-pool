import { cropInfo } from '@/data/crops';

import { allocate, generateCombinations } from './candidates';
import { rankCombination, rankingModelInfo } from './ranking';
import {
  BuyerOrder,
  CostBreakdown,
  FarmEvaluation,
  Harvest,
  MatchBreakdown,
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

  // Rules-based match score, split into named parts so the buyer can see
  // exactly why a farm scores the way it does. All parts are 0-100.
  const bufferDays = Math.floor(
    (Date.parse(order.deliveryDate) - Date.parse(harvest.harvestDate)) / (24 * 60 * 60 * 1000),
  );
  const band = cropInfo(harvest.crop)?.typicalPricePerKg;
  const breakdown: MatchBreakdown = {
    condition: { Economy: 60, Standard: 80, Premium: 95 }[harvest.condition],
    timing: bufferDays >= 3 ? 100 : bufferDays >= 1 ? 85 : 70,
    distance: Math.round(Math.max(0, 100 - distance / 5)),
    price: band
      ? Math.round(
          Math.min(
            100,
            Math.max(
              60,
              100 - ((harvest.minimumPricePerKg - band[0]) / (band[1] - band[0])) * 40,
            ),
          ),
        )
      : 80,
    reliability: harvest.reliability,
  };
  const score =
    breakdown.condition * 0.3 +
    breakdown.timing * 0.2 +
    breakdown.distance * 0.2 +
    breakdown.price * 0.15 +
    breakdown.reliability * 0.15;

  return {
    harvest,
    eligible: reasons.length === 0,
    score: Math.round(score),
    breakdown,
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
): { top: RankedCombination[]; withinPriceCeiling: boolean } {
  const combinations = generateCombinations(order, eligible);

  const ranked = combinations.map((combination) => {
    const lots = allocate(order, combination);
    const fulfilledKg = lots.reduce((sum, lot) => sum + lot.allocatedKg, 0);
    const cost = calculateCosts(lots, fulfilledKg);
    const withinBudget = cost.deliveredPerKg <= order.maximumDeliveredPricePerKg;
    return rankCombination(order, lots, cost, withinBudget);
  });

  // The buyer's price ceiling is a hard constraint the ML model can never
  // override. Affordable pools are ranked by score. When nothing is
  // affordable, the result is NOT a recommendation list: it is the closest
  // alternatives, ordered by how far they miss the ceiling, and the UI must
  // present them as failures the buyer can only accept explicitly.
  const affordable = ranked.filter((combination) => combination.withinBudget);
  if (affordable.length > 0) {
    return {
      withinPriceCeiling: true,
      top: affordable
        .sort(
          (a, b) =>
            b.finalScore - a.finalScore ||
            a.cost.deliveredPerKg - b.cost.deliveredPerKg ||
            a.id.localeCompare(b.id),
        )
        .slice(0, 3)
        .map((combination, index) => ({ ...combination, rank: index + 1 })),
    };
  }
  return {
    withinPriceCeiling: false,
    top: ranked
      .sort(
        (a, b) =>
          a.cost.deliveredPerKg - b.cost.deliveredPerKg || a.id.localeCompare(b.id),
      )
      .slice(0, 3)
      .map((combination, index) => ({ ...combination, rank: index + 1 })),
  };
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
  const { top: rankedCombinations, withinPriceCeiling } = rankFeasibleCombinations(
    order,
    eligible,
  );
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
    withinPriceCeiling,
    selectedCombinationId: winner ? winner.id : null,
    modelInfo: rankingModelInfo(),
    createdAt: new Date().toISOString(),
  };
}

