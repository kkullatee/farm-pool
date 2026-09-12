import { BuyerOrder, CostBreakdown, SelectedLot } from './types';

/**
 * Feature extraction for the ML ranking layer.
 *
 * IMPORTANT: these definitions must stay in lockstep with
 * ml/generate_training_data.py — the model is trained on exactly this schema.
 * Every feature is computed from a feasible combination only; feasibility
 * itself is decided by deterministic rules in matching.ts, never here.
 */

export const FEATURE_LABELS: Record<string, string> = {
  avg_reliability: 'Farm reliability',
  min_reliability: 'Weakest farm reliability',
  on_time_rate: 'On-time delivery history',
  farm_count: 'Farms to coordinate',
  quantity_buffer: 'Spare supply buffer',
  avg_distance_km: 'Average haul distance',
  max_distance_km: 'Farthest farm distance',
  harvest_buffer_days: 'Harvest-to-delivery buffer',
  price_headroom: 'Price headroom',
  prior_buyer_share: 'Prior history with this buyer',
};

/** Direction-aware phrasing for explanations: [helps the prediction, hurts it]. */
export const FEATURE_PHRASES: Record<string, [string, string]> = {
  avg_reliability: ['high farm reliability', 'low farm reliability'],
  min_reliability: ['every farm is dependable', 'a weak farm in the pool'],
  on_time_rate: ['strong on-time history', 'patchy on-time history'],
  farm_count: ['a small, easy-to-coordinate pool', 'many farms to coordinate'],
  quantity_buffer: ['spare supply in reserve', 'no spare supply'],
  avg_distance_km: ['short average haul', 'long average haul'],
  max_distance_km: ['a compact collection route', 'one far-out farm'],
  harvest_buffer_days: ['a comfortable harvest buffer', 'tight harvest timing'],
  price_headroom: ['clear price headroom', 'thin price headroom'],
  prior_buyer_share: ['proven history with this buyer', 'no history with this buyer'],
};

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

const DAY_MS = 24 * 60 * 60 * 1000;

export function combinationFeatures(
  order: BuyerOrder,
  lots: SelectedLot[],
  cost: CostBreakdown,
): Record<string, number> {
  const fulfilledKg = lots.reduce((sum, lot) => sum + lot.allocatedKg, 0);
  const weights = lots.map((lot) => (fulfilledKg ? lot.allocatedKg / fulfilledKg : 0));
  const weighted = (value: (lot: SelectedLot) => number) =>
    lots.reduce((sum, lot, index) => sum + weights[index] * value(lot), 0);

  const totalAvailableKg = lots.reduce((sum, lot) => sum + lot.harvest.quantityKg, 0);
  const deliveryTime = Date.parse(order.deliveryDate);
  const buyer = order.businessName.trim().toLowerCase();

  return {
    avg_reliability: weighted((lot) => lot.harvest.reliability / 100),
    min_reliability: Math.min(...lots.map((lot) => lot.harvest.reliability / 100)),
    on_time_rate: weighted(
      (lot) => (lot.harvest.onTimePct ?? lot.harvest.reliability) / 100,
    ),
    farm_count: lots.length,
    quantity_buffer: clamp(totalAvailableKg / order.quantityKg - 1, 0, 1),
    avg_distance_km: weighted((lot) => lot.distanceKm),
    max_distance_km: Math.max(...lots.map((lot) => lot.distanceKm)),
    harvest_buffer_days: clamp(
      Math.min(
        ...lots.map((lot) => (deliveryTime - Date.parse(lot.harvest.harvestDate)) / DAY_MS),
      ),
      0,
      14,
    ),
    price_headroom: clamp(
      (order.maximumDeliveredPricePerKg - cost.deliveredPerKg) /
        order.maximumDeliveredPricePerKg,
      -0.5,
      0.5,
    ),
    prior_buyer_share: lots.reduce(
      (sum, lot, index) =>
        sum +
        ((lot.harvest.pastBuyers ?? []).some((name) => name.trim().toLowerCase() === buyer)
          ? weights[index]
          : 0),
      0,
    ),
  };
}
