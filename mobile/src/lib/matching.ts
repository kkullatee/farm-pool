import { BuyerOrder, CostBreakdown, FarmEvaluation, Harvest, MatchPlan, SelectedLot } from './types';

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
  if (harvest.brix < order.minimumBrix) {
    reasons.push(`Brix ${harvest.brix.toFixed(1)} is below ${order.minimumBrix.toFixed(1)}`);
  }
  if (harvest.defectsPct > order.maximumDefectsPct) {
    reasons.push(
      `Defects ${harvest.defectsPct.toFixed(1)}% exceed ${order.maximumDefectsPct.toFixed(1)}%`,
    );
  }
  if (harvest.firmness !== order.firmness) {
    reasons.push(`Firmness is ${harvest.firmness.toLowerCase()}`);
  }
  if (harvest.harvestDate > order.deliveryDate) {
    reasons.push('Harvest is not ready before delivery');
  }

  const qualityScore = Math.max(
    0,
    Math.min(100, 72 + (harvest.brix - order.minimumBrix) * 6 - harvest.defectsPct * 1.5),
  );
  const distanceScore = Math.max(0, 100 - distance / 5);
  const score = qualityScore * 0.45 + harvest.reliability * 0.35 + distanceScore * 0.2;

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

export function buildMatchPlan(order: BuyerOrder, harvests: Harvest[]): MatchPlan {
  const evaluations = harvests.map((harvest) => evaluateHarvest(harvest, order));
  const eligible = evaluations
    .filter((evaluation) => evaluation.eligible)
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
  const rejected = evaluations.filter((evaluation) => !evaluation.eligible);

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

  const fulfilledKg = selected.reduce((sum, lot) => sum + lot.allocatedKg, 0);
  const weightedBrix = fulfilledKg
    ? selected.reduce((sum, lot) => sum + lot.harvest.brix * lot.allocatedKg, 0) / fulfilledKg
    : 0;
  const weightedDefects = fulfilledKg
    ? selected.reduce((sum, lot) => sum + lot.harvest.defectsPct * lot.allocatedKg, 0) /
      fulfilledKg
    : 0;
  const cost = calculateCosts(selected, fulfilledKg);

  return {
    order,
    selected,
    rejected,
    eligibleNotNeeded,
    requestedKg: order.quantityKg,
    fulfilledKg,
    fillRate: order.quantityKg ? Math.min(1, fulfilledKg / order.quantityKg) : 0,
    weightedBrix,
    weightedDefects,
    cost,
    withinBudget:
      fulfilledKg >= order.quantityKg &&
      cost.deliveredPerKg <= order.maximumDeliveredPricePerKg,
    createdAt: new Date().toISOString(),
  };
}

