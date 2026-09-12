"""Train the FarmPool fulfilment-ranking model and export it for the app.

Pipeline position: this model NEVER decides feasibility. Deterministic rules
(mobile/src/lib/matching.ts) filter to feasible farm combinations first; this
model only scores the survivors by predicted fulfilment probability.

Model choice: logistic regression.
  - The strongest signal in the (synthetic) fulfilment data is monotonic
    (reliability up -> success up, distance up -> success down), which a
    linear model captures well.
  - Coefficients are directly inspectable and per-prediction contributions
    (coefficient x standardized feature) power the "why this ranked highly"
    explanations in the UI.
  - Inference is a dot product + sigmoid, so the exported model runs
    bit-identically inside the Expo app with no server and no ML runtime.
Random forest and gradient boosting are trained as comparison baselines and
reported; we keep logistic regression unless it materially underperforms.

Output: model.json
  - feature names, standardization means/stds, coefficients, intercept
  - held-out metrics for all three candidate models
  - verification cases so the TypeScript port can prove numerical parity

Reproducible: fixed seeds everywhere; same CSV in -> same model.json out.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import train_test_split

SEED = 42
HERE = Path(__file__).parent
DATA = HERE / "training_data.csv"
MODEL_OUT = HERE / "model.json"
APP_MODEL_OUT = HERE.parent / "mobile" / "src" / "lib" / "ranking-model.json"

FEATURES = [
    "avg_reliability",
    "min_reliability",
    "on_time_rate",
    "farm_count",
    "quantity_buffer",
    "avg_distance_km",
    "max_distance_km",
    "harvest_buffer_days",
    "price_headroom",
    "prior_buyer_share",
]


def load_data() -> tuple[np.ndarray, np.ndarray]:
    with DATA.open() as f:
        rows = list(csv.DictReader(f))
    X = np.array([[float(row[name]) for name in FEATURES] for row in rows])
    y = np.array([int(row["fulfilled"]) for row in rows])
    return X, y


def main() -> None:
    X, y = load_data()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=SEED, stratify=y
    )

    # Standardize with train-set statistics (exported for the TS port).
    means = X_train.mean(axis=0)
    stds = X_train.std(axis=0)
    stds[stds == 0] = 1.0
    Xs_train = (X_train - means) / stds
    Xs_test = (X_test - means) / stds

    candidates = {
        "logistic_regression": LogisticRegression(max_iter=2000, random_state=SEED),
        "random_forest": RandomForestClassifier(
            n_estimators=300, max_depth=6, random_state=SEED
        ),
        "gradient_boosting": GradientBoostingClassifier(random_state=SEED),
    }

    metrics: dict[str, dict[str, float]] = {}
    for name, model in candidates.items():
        model.fit(Xs_train, y_train)
        proba = model.predict_proba(Xs_test)[:, 1]
        metrics[name] = {
            "auc": round(float(roc_auc_score(y_test, proba)), 4),
            "accuracy": round(float(accuracy_score(y_test, proba >= 0.5)), 4),
            "brier": round(float(brier_score_loss(y_test, proba)), 4),
        }

    print(f"{'model':<22} {'AUC':>7} {'acc':>7} {'brier':>7}")
    for name, m in metrics.items():
        print(f"{name:<22} {m['auc']:>7.4f} {m['accuracy']:>7.4f} {m['brier']:>7.4f}")

    lr: LogisticRegression = candidates["logistic_regression"]  # type: ignore[assignment]

    # Verification cases: prove the TypeScript inference matches sklearn.
    rng = np.random.default_rng(SEED)
    idx = rng.choice(len(X_test), size=5, replace=False)
    verification = [
        {
            "features": {name: float(v) for name, v in zip(FEATURES, X_test[i])},
            "expected_probability": round(float(lr.predict_proba(Xs_test[i : i + 1])[0, 1]), 6),
        }
        for i in idx
    ]

    payload = {
        "model_type": "logistic_regression",
        "library": "scikit-learn",
        "target": "probability that a feasible farm combination fulfils the buyer order",
        "data_source": (
            "SYNTHETIC fulfilment history (ml/generate_training_data.py, seed 42). "
            "Schema matches real fulfilment logs so real data is a drop-in replacement."
        ),
        "trained_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "metrics": metrics,
        "features": FEATURES,
        "means": [round(float(v), 6) for v in means],
        "stds": [round(float(v), 6) for v in stds],
        "coefficients": [round(float(v), 6) for v in lr.coef_[0]],
        "intercept": round(float(lr.intercept_[0]), 6),
        "verification_cases": verification,
    }

    for out in (MODEL_OUT, APP_MODEL_OUT):
        out.write_text(json.dumps(payload, indent=2) + "\n")
        print(f"Wrote {out}")


if __name__ == "__main__":
    main()
