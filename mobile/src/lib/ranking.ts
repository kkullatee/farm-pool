import model from './ranking-model.json';

import { FEATURE_LABELS, FEATURE_PHRASES, combinationFeatures } from './features';
import {
  BuyerOrder,
  CostBreakdown,
  FactorContribution,
  RankedCombination,
  RankingModelInfo,
  SelectedLot,
} from './types';

/**
 * ML ranking layer (step 2 of the hybrid pipeline).
 *
 * The model is a scikit-learn logistic regression trained offline
 * (ml/train_model.py) and exported as plain coefficients, so inference here
 * is an exact, reproducible port: standardize -> dot product -> sigmoid.
 * It predicts the probability that a feasible farm combination fulfils the
 * buyer order. It never decides feasibility — only the order of feasible
 * combinations. Same inputs always produce the same scores.
 */

const TRUCK_CAPACITY_KG = 12000;

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function predictFulfilment(features: Record<string, number>): {
  probability: number;
  contributions: FactorContribution[];
} {
  let z = model.intercept;
  const contributions: FactorContribution[] = [];

  model.features.forEach((name, index) => {
    const value = features[name] ?? 0;
    const standardized = (value - model.means[index]) / model.stds[index];
    const contribution = model.coefficients[index] * standardized;
    z += contribution;
    contributions.push({
      feature: name,
      label: FEATURE_LABELS[name] ?? name,
      value,
      contribution,
      direction: contribution >= 0 ? 'positive' : 'negative',
    });
  });

  return { probability: sigmoid(z), contributions };
}

/** Deterministic route-efficiency score: short hauls and full trucks rank higher. */
function logisticsScoreFor(features: Record<string, number>, cost: CostBreakdown, fulfilledKg: number) {
  const haul = 1 - Math.min(1, features.avg_distance_km / 300);
  const utilisation = cost.trucks ? fulfilledKg / (cost.trucks * TRUCK_CAPACITY_KG) : 0;
  return clamp01(0.6 * haul + 0.4 * utilisation);
}

/** Deterministic buyer-fit score: price headroom and prior history. */
function buyerFitScoreFor(features: Record<string, number>) {
  return clamp01(
    0.5 * clamp01(features.price_headroom / 0.25) + 0.5 * features.prior_buyer_share,
  );
}

function explain(
  probability: number,
  topFactors: FactorContribution[],
  features: Record<string, number>,
): string {
  const phrase = (factor: FactorContribution) =>
    FEATURE_PHRASES[factor.feature]?.[factor.direction === 'positive' ? 0 : 1] ??
    factor.label.toLowerCase();
  const positives = topFactors
    .filter((factor) => factor.direction === 'positive')
    .slice(0, 2)
    .map(phrase);
  const negative = topFactors.find((factor) => factor.direction === 'negative');

  const parts = [`${Math.round(probability * 100)}% predicted fulfilment`];
  if (positives.length) parts.push(positives.join(' and '));
  if (negative) parts.push(`watch: ${phrase(negative)}`);
  parts.push(`${features.farm_count} farm${features.farm_count === 1 ? '' : 's'}, avg ${Math.round(features.avg_distance_km)} km haul`);
  return parts.join(' · ');
}

export function rankCombination(
  order: BuyerOrder,
  lots: SelectedLot[],
  cost: CostBreakdown,
  withinBudget: boolean,
): RankedCombination {
  const fulfilledKg = lots.reduce((sum, lot) => sum + lot.allocatedKg, 0);
  const features = combinationFeatures(order, lots, cost);
  const { probability, contributions } = predictFulfilment(features);

  const logisticsScore = logisticsScoreFor(features, cost, fulfilledKg);
  const buyerFitScore = buyerFitScoreFor(features);
  const finalScore = 0.6 * probability + 0.25 * logisticsScore + 0.15 * buyerFitScore;

  const topFactors = [...contributions]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3);

  return {
    id: lots.map((lot) => lot.harvest.id).join('+'),
    rank: 0,
    lots,
    fulfilledKg,
    cost,
    withinBudget,
    fulfilmentProbability: probability,
    logisticsScore,
    buyerFitScore,
    finalScore,
    topFactors,
    explanation: explain(probability, topFactors, features),
    features,
  };
}

export function rankingModelInfo(): RankingModelInfo {
  return {
    modelType: model.model_type,
    library: model.library,
    auc: model.metrics.logistic_regression.auc,
    trainedRows: model.trained_rows,
    dataSource: model.data_source,
  };
}

/**
 * Numerical parity check against sklearn's own predictions, exported with the
 * model. Returns the largest absolute deviation across verification cases.
 */
export function modelParityError(): number {
  return model.verification_cases.reduce((worst, testCase) => {
    const { probability } = predictFulfilment(testCase.features);
    return Math.max(worst, Math.abs(probability - testCase.expected_probability));
  }, 0);
}
