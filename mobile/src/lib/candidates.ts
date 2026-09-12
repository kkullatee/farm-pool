import { BuyerOrder, FarmEvaluation, SelectedLot } from './types';

/**
 * Candidate generation (between the deterministic filter and the ML ranker).
 *
 * Input: farms that individually passed every hard rule. Output: combinations
 * whose pooled quantity covers the order — the only options the ML layer is
 * allowed to rank. Enumeration is exhaustive over minimal subsets, fully
 * deterministic, and capped so it stays instant at demo scale.
 */

const MAX_POOL_FARMS = 12; // strongest individual farms considered for pooling
const MAX_FARMS_PER_COMBINATION = 5;
const MAX_CANDIDATES = 40;

function sortEligible(eligible: FarmEvaluation[]): FarmEvaluation[] {
  return [...eligible].sort(
    (a, b) =>
      b.score - a.score ||
      a.distanceKm - b.distanceKm ||
      a.harvest.id.localeCompare(b.harvest.id),
  );
}

/** Greedy kg allocation across a combination, strongest rule-score farm first. */
export function allocate(order: BuyerOrder, combination: FarmEvaluation[]): SelectedLot[] {
  let remaining = order.quantityKg;
  return sortEligible(combination).map((evaluation) => {
    const allocatedKg = Math.min(remaining, evaluation.harvest.quantityKg);
    remaining -= allocatedKg;
    return { ...evaluation, allocatedKg };
  });
}

/**
 * Enumerate minimal feasible combinations: pooled quantity covers the order,
 * and no farm can be dropped without falling short. Minimality keeps the
 * candidate set free of padded supersets that only add coordination risk.
 */
export function generateCombinations(
  order: BuyerOrder,
  eligible: FarmEvaluation[],
): FarmEvaluation[][] {
  const pool = sortEligible(eligible).slice(0, MAX_POOL_FARMS);
  const required = order.quantityKg;
  const results: FarmEvaluation[][] = [];

  const walk = (start: number, chosen: FarmEvaluation[], totalKg: number) => {
    if (totalKg >= required) {
      const minimal = chosen.every(
        (farm) => totalKg - farm.harvest.quantityKg < required,
      );
      if (minimal) results.push([...chosen]);
      return; // any farm added past this point would not be minimal
    }
    if (chosen.length === MAX_FARMS_PER_COMBINATION) return;
    for (let index = start; index < pool.length; index += 1) {
      chosen.push(pool[index]);
      walk(index + 1, chosen, totalKg + pool[index].harvest.quantityKg);
      chosen.pop();
    }
  };
  walk(0, [], 0);

  // Deterministic cap: prefer combinations of stronger rule-scored farms.
  return results
    .map((combination) => ({
      combination,
      strength: combination.reduce((sum, farm) => sum + farm.score, 0) / combination.length,
    }))
    .sort(
      (a, b) =>
        b.strength - a.strength ||
        a.combination.length - b.combination.length ||
        a.combination
          .map((farm) => farm.harvest.id)
          .join('+')
          .localeCompare(b.combination.map((farm) => farm.harvest.id).join('+')),
    )
    .slice(0, MAX_CANDIDATES)
    .map((entry) => entry.combination);
}
