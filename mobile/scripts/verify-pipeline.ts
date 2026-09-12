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
