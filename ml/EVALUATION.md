# Model evaluation (synthetic data)

Everything on this page is measured on the held-out quarter of the
SYNTHETIC dataset (seed 42). None of it is real-world performance;
the schema is the real fulfilment log, so real data replaces it later.

Split: 4500 train / 1500 test rows.

## Model candidates

| model | AUC | accuracy | Brier |
|---|---|---|---|
| logistic_regression | 0.7994 | 0.7267 | 0.1803 |
| random_forest | 0.7847 | 0.7207 | 0.1861 |
| gradient_boosting | 0.7914 | 0.7233 | 0.1845 |

## Ablation: why hybrid rules + ML

Rules alone guarantee feasibility but cannot order feasible pools by
risk. The closest measurable rules-only proxy is ranking by a single
operational signal:

| ranking strategy | AUC (synthetic test set) |
|---|---|
| reliability only | 0.6814 |
| price headroom only | 0.5328 |
| distance only | 0.589 |
| logistic regression (all 10 features) | 0.7994 |

The learned model beats every single-signal ordering, which is the
case for the hybrid: rules decide what is allowed, the model orders
what is allowed by fulfilment risk.

## Threshold metrics at 0.5

Precision 0.7002, recall 0.6161.
Confusion: tp 390, fp 167, fn 243, tn 700.

## Calibration (10 bins)

| predicted | observed | n |
|---|---|---|
| 0.057 | 0.062 | 192 |
| 0.15 | 0.164 | 232 |
| 0.252 | 0.273 | 183 |
| 0.353 | 0.414 | 186 |
| 0.452 | 0.44 | 150 |
| 0.551 | 0.617 | 120 |
| 0.647 | 0.5 | 110 |
| 0.75 | 0.715 | 137 |
| 0.853 | 0.864 | 125 |
| 0.933 | 0.846 | 65 |

## Coefficients (standardized features)

| feature | weight |
|---|---|
| min_reliability | 0.774044 |
| harvest_buffer_days | 0.521738 |
| farm_count | -0.419855 |
| quantity_buffer | 0.320301 |
| avg_distance_km | -0.301988 |
| prior_buyer_share | 0.263716 |
| on_time_rate | 0.234968 |
| price_headroom | 0.208191 |
| avg_reliability | 0.208188 |
| max_distance_km | -0.205388 |

## Feedback loop

Completed orders in the app are logged in this exact feature schema
with fulfilled / on-time / dropout labels. Retraining on real records
is `python train_model.py` on the exported log: synthetic bootstrap,
then real marketplace data.
