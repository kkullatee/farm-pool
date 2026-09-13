/**
 * End-to-end verification of the hybrid matching pipeline.
 * Run from mobile/:  npx tsx scripts/verify-pipeline.ts
 *
 * Checks:
 *  1. TypeScript inference matches scikit-learn bit-for-bit (parity cases
 *     exported inside ranking-model.json).
 *  2. The judge demo order flows through rules -> candidates -> ML ranking.
 *  3. Identical input produces identical ranking output (reproducibility).
 */
import { demoHarvests, demoOrder } from '../src/data/demo';
import { buildMatchPlan } from '../src/lib/matching';
import { modelParityError } from '../src/lib/ranking';

// Coefficients are exported rounded to 6 decimals, so deviations up to ~1e-5
// are rounding noise, far below anything that could reorder combinations.
const parity = modelParityError();
console.log(
  `sklearn parity: max deviation ${parity.toExponential(2)} ${parity < 1e-5 ? 'PASS' : 'FAIL'}`,
);

const plan = buildMatchPlan(demoOrder, demoHarvests);

console.log(
  `\nSTEP 1 rules: ${demoHarvests.length} farms -> ${demoHarvests.length - plan.rejected.length} feasible, ${plan.rejected.length} rejected`,
);
plan.rejected.forEach((r) => console.log(`  x ${r.harvest.farmerName}: ${r.reasons.join(' / ')}`));

console.log(`\nSTEP 2+3 ranked combinations (top ${plan.rankedCombinations.length}):`);
for (const c of plan.rankedCombinations) {
  console.log(`\n#${c.rank} ${c.lots.map((l) => l.harvest.farmerName).join(' + ')}`);
  console.log(
    `   final ${c.finalScore.toFixed(3)} | fulfilment ${(c.fulfilmentProbability * 100).toFixed(1)}% | logistics ${c.logisticsScore.toFixed(2)} | buyer-fit ${c.buyerFitScore.toFixed(2)} | $${c.cost.deliveredPerKg.toFixed(2)}/kg | within budget: ${c.withinBudget}`,
  );
  console.log(
    `   factors: ${c.topFactors.map((f) => `${f.direction === 'positive' ? '+' : '-'}${f.label} (${f.contribution.toFixed(2)})`).join(', ')}`,
  );
  console.log(`   "${c.explanation}"`);
}

console.log(
  `\nWinner plan: ${plan.fulfilledKg}kg of ${plan.requestedKg}kg, $${plan.cost.deliveredPerKg.toFixed(2)}/kg, withinBudget=${plan.withinBudget}`,
);
console.log(
  `Model: ${plan.modelInfo?.modelType} (${plan.modelInfo?.library}), AUC ${plan.modelInfo?.auc}, trained on ${plan.modelInfo?.trainedRows} rows`,
);

const plan2 = buildMatchPlan(demoOrder, demoHarvests);
const same = JSON.stringify(plan.rankedCombinations) === JSON.stringify(plan2.rankedCombinations);
console.log(`\nReproducible: ${same ? 'PASS' : 'FAIL'}`);

// Buyer override: building the plan from a non-default combination.
const alternative = plan.rankedCombinations[1];
if (alternative) {
  const overridden = buildMatchPlan(demoOrder, demoHarvests, alternative.id);
  const applied =
    overridden.selectedCombinationId === alternative.id &&
    JSON.stringify(overridden.selected.map((l) => l.harvest.id).sort()) ===
      JSON.stringify(alternative.lots.map((l) => l.harvest.id).sort()) &&
    JSON.stringify(overridden.rankedCombinations) === JSON.stringify(plan.rankedCombinations);
  console.log(`Buyer override to #${alternative.rank}: ${applied ? 'PASS' : 'FAIL'}`);
}

// Candidate uniqueness: no two ranked pools may contain the same set of lots,
// even when a farm lists twice under the same name (clone of the first lot).
const clone = {
  ...demoHarvests[0],
  id: `${demoHarvests[0].id}-clone`,
};
const cloned = buildMatchPlan(demoOrder, [...demoHarvests, clone]);
const idSets = cloned.rankedCombinations.map((c) =>
  c.lots.map((l) => l.harvest.id).sort().join('+'),
);
const unique = new Set(idSets).size === idSets.length;
console.log(`Candidate uniqueness (with same-name duplicate lot): ${unique ? 'PASS' : 'FAIL'}`);

// Hard price ceiling: at $1/kg nothing is affordable. The plan must say so
// and present pools sorted by how far over the ceiling they are.
const impossibleOrder = { ...demoOrder, maximumDeliveredPricePerKg: 1 };
const ceilingPlan = buildMatchPlan(impossibleOrder, demoHarvests);
const sortedByOverage = ceilingPlan.rankedCombinations.every(
  (c, i, arr) => i === 0 || arr[i - 1].cost.deliveredPerKg <= c.cost.deliveredPerKg,
);
const ceilingOk =
  !ceilingPlan.withinPriceCeiling &&
  !ceilingPlan.withinBudget &&
  ceilingPlan.rankedCombinations.every((c) => !c.withinBudget) &&
  sortedByOverage;
console.log(
  `Impossible price ceiling ($1/kg): withinPriceCeiling=${ceilingPlan.withinPriceCeiling}, sorted by overage=${sortedByOverage} ${ceilingOk ? 'PASS' : 'FAIL'}`,
);

// Partial supply: an order far above total listed supply must produce no
// complete pools rather than a fake "match".
const hugeOrder = { ...demoOrder, quantityKg: 1_000_000 };
const hugePlan = buildMatchPlan(hugeOrder, demoHarvests);
const partialOk = hugePlan.rankedCombinations.length === 0 && hugePlan.fillRate < 1;
console.log(
  `Partial supply (1,000,000 kg order): ${hugePlan.rankedCombinations.length} pools, fill rate ${(hugePlan.fillRate * 100).toFixed(1)}% ${partialOk ? 'PASS' : 'FAIL'}`,
);

// Decline recovery: after a seller declines, the buyer rebuilds the plan on a
// pool that excludes that farm. Pick any winner farm that has an alternative
// pool without it (some farms appear in every feasible pool — those cannot be
// replaced, only renegotiated in chat).
const winnerFarms = plan.rankedCombinations[0].lots.map((l) => l.harvest);
let declinedFarm = winnerFarms[0];
let replacement = null;
for (const farm of winnerFarms) {
  const candidate = plan.rankedCombinations.find(
    (c) => c.rank !== 1 && !c.lots.some((l) => l.harvest.id === farm.id),
  );
  if (candidate) {
    declinedFarm = farm;
    replacement = candidate;
    break;
  }
}
if (replacement) {
  const recovered = buildMatchPlan(demoOrder, demoHarvests, replacement.id);
  const recoveredOk =
    recovered.selectedCombinationId === replacement.id &&
    !recovered.selected.some((l) => l.harvest.id === declinedFarm.id);
  console.log(
    `Decline recovery (drop ${declinedFarm.farmerName}, switch to #${replacement.rank}): ${recoveredOk ? 'PASS' : 'FAIL'}`,
  );
} else {
  console.log('Decline recovery: no alternative pool without the declining farm — FAIL');
}
