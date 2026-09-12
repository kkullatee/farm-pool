# FarmPool ranking model

The ML half of the hybrid matching pipeline. Deterministic rules in
`mobile/src/lib/matching.ts` decide **feasibility**; the model trained here only
decides the **order** of feasible farm combinations.

```
buyer order ──► deterministic filter ──► feasible combinations ──► ML ranking ──► top 3
                (rules, hard limits)      (rules, enumeration)     (this model)
```

## What the model is

A scikit-learn **logistic regression** that predicts
*P(a feasible farm combination fulfils the buyer order)* — delivered in full,
on time, and accepted at the physical quality checkpoint.

Chosen over random forest / gradient boosting because on this data it scores
best while staying fully inspectable (both baselines are trained and reported
by `train_model.py` for comparison):

| model               | AUC    | accuracy | Brier |
|---------------------|--------|----------|-------|
| logistic regression | 0.799  | 0.727    | 0.180 |
| random forest       | 0.785  | 0.721    | 0.186 |
| gradient boosting   | 0.791  | 0.723    | 0.185 |

Coefficients export to `model.json`, so the Expo app reproduces inference
exactly (standardize → dot product → sigmoid) with no server and no ML runtime.
`model.json` also carries verification cases; `mobile/scripts/verify-pipeline.ts`
proves the TypeScript port matches sklearn to < 1e-6.

## Features (10)

Computed identically in `generate_training_data.py` (training) and
`mobile/src/lib/features.ts` (inference) — keep them in lockstep:

| feature               | meaning                                                        |
|-----------------------|----------------------------------------------------------------|
| `avg_reliability`     | allocation-weighted mean farm fulfilment reliability (0–1)     |
| `min_reliability`     | reliability of the weakest farm in the pool (0–1)              |
| `on_time_rate`        | weighted mean historical on-time delivery rate (0–1)           |
| `farm_count`          | farms to coordinate                                            |
| `quantity_buffer`     | spare supply: total available / required − 1, capped at 1      |
| `avg_distance_km`     | weighted mean farm → delivery distance                         |
| `max_distance_km`     | farthest farm distance                                         |
| `harvest_buffer_days` | tightest harvest-to-delivery window, clamped 0–14              |
| `price_headroom`      | (max price − delivered price) / max price, clamped ±0.5        |
| `prior_buyer_share`   | share of kg from farms that previously supplied this buyer     |

## Training data — SYNTHETIC, clearly labelled

FarmPool has no real fulfilment history yet, so `generate_training_data.py`
simulates 6,000 historical pooled-order attempts (seed 42) with a documented
causal structure grounded in how pooled orders actually fail: a weak farm drops
out, tight harvest timing meets a long haul, no spare supply to re-cover. The
label is binary `fulfilled`.

The CSV schema **is** the schema of the platform's future fulfilment logs.
To retrain on real data, replace `training_data.csv` with a real export and
rerun `train_model.py` — nothing else changes.

## Reproduce

```bash
pip install scikit-learn numpy
python3 generate_training_data.py   # seed 42 → training_data.csv
python3 train_model.py              # → model.json + mobile/src/lib/ranking-model.json
cd ../mobile && npx tsx scripts/verify-pipeline.ts   # parity + demo run
```

Fixed seeds end to end: same inputs always produce the same model and the same
rankings in the app.

## What is honestly AI/ML vs rules

- **ML**: the fulfilment probability (learned logistic-regression weights).
- **Rules**: feasibility filtering, candidate enumeration, cost model,
  logistics score, buyer-fit score, and the final blend
  `0.6 × P(fulfil) + 0.25 × logistics + 0.15 × buyer fit`.
- **Not generative AI**: no LLM is involved in matching. (The separate produce
  photo assessment in `backend/` does call a multimodal model when configured.)
