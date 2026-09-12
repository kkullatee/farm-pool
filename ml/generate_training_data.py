"""Generate the SYNTHETIC training dataset for the FarmPool ranking model.

=============================================================================
THIS IS SYNTHETIC DATA — clearly labelled as such.
FarmPool does not yet have enough real completed pooled orders to train on.
Every row simulates one historical "pooled order attempt": a buyer order that
was matched to a combination of farms, together with whether the combination
actually fulfilled the order successfully (delivered in full, on time, and
accepted at the quality checkpoint).

The schema is EXACTLY the schema of real fulfilment logs the platform will
accumulate, so retraining on real data later is a drop-in replacement:
    python generate_training_data.py   ->  training_data.csv   (synthetic)
    <real fulfilment export>           ->  training_data.csv   (real)
    python train_model.py              ->  model.json
=============================================================================

Feature definitions (must stay in lockstep with mobile/src/lib/features.ts):

  avg_reliability      allocation-weighted mean of farm fulfilment reliability (0-1)
  min_reliability      reliability of the weakest farm in the combination (0-1)
  on_time_rate         allocation-weighted mean historical on-time delivery rate (0-1)
  farm_count           number of farms pooled for the order
  quantity_buffer      spare supply: min(total available / required - 1, 1)
  avg_distance_km      allocation-weighted mean farm -> delivery point distance
  max_distance_km      distance of the farthest farm in the combination
  harvest_buffer_days  min over farms of (delivery date - harvest ready date), clamped 0-14
  price_headroom       (max delivered price - estimated delivered price) / max price, clamped -0.5..0.5
  prior_buyer_share    share of allocated kg from farms that previously supplied this buyer

Label:
  fulfilled            1 if the pooled order was delivered in full, on time and
                       passed the physical quality checkpoint, else 0
"""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np

SEED = 42
N_ROWS = 6000
OUT = Path(__file__).parent / "training_data.csv"

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


def simulate(rng: np.random.Generator, n: int) -> list[dict[str, float]]:
    rows: list[dict[str, float]] = []
    for _ in range(n):
        farm_count = int(rng.integers(1, 6))

        # Farm reliability profiles cluster high (farms on the platform are vetted)
        # but with a meaningful weak tail.
        reliabilities = np.clip(rng.beta(8, 1.6, size=farm_count), 0.45, 0.995)
        avg_reliability = float(np.mean(reliabilities))
        min_reliability = float(np.min(reliabilities))

        on_time_rate = float(np.clip(avg_reliability + rng.normal(0, 0.06), 0.4, 1.0))

        quantity_buffer = float(np.clip(rng.exponential(0.18), 0.0, 1.0))

        # Distances: most supply is regional, some long-haul.
        base = rng.uniform(15, 320)
        spread = rng.uniform(0, 180) if farm_count > 1 else 0.0
        avg_distance_km = float(base)
        max_distance_km = float(base + spread)

        harvest_buffer_days = float(np.clip(rng.gamma(2.2, 1.6), 0, 14))
        price_headroom = float(np.clip(rng.normal(0.12, 0.12), -0.5, 0.5))
        prior_buyer_share = float(np.clip(rng.beta(1.2, 2.4), 0, 1))

        # --- True (hidden) fulfilment process the model must learn -----------
        # Grounded in how pooled orders actually fail: a weak farm drops out,
        # tight harvest timing meets a long haul, no spare supply to re-cover.
        logit = (
            0.2
            + 5.2 * (avg_reliability - 0.85)
            + 3.4 * (min_reliability - 0.80)
            + 2.4 * (on_time_rate - 0.85)
            - 0.30 * (farm_count - 1)  # coordination overhead per extra farm
            + 1.8 * quantity_buffer
            - 0.0045 * avg_distance_km
            - 0.0022 * (max_distance_km - avg_distance_km)
            + 0.16 * harvest_buffer_days
            + 2.2 * price_headroom
            + 1.1 * prior_buyer_share
            # Interactions: tight harvest window is much worse on long routes;
            # one weak farm hurts more the larger the pool.
            - 0.0016 * max(0.0, 3.0 - harvest_buffer_days) * avg_distance_km
            - 1.6 * max(0.0, 0.75 - min_reliability) * (farm_count - 1)
        )
        p = 1.0 / (1.0 + np.exp(-logit))
        fulfilled = int(rng.random() < p)

        rows.append(
            {
                "avg_reliability": round(avg_reliability, 4),
                "min_reliability": round(min_reliability, 4),
                "on_time_rate": round(on_time_rate, 4),
                "farm_count": farm_count,
                "quantity_buffer": round(quantity_buffer, 4),
                "avg_distance_km": round(avg_distance_km, 1),
                "max_distance_km": round(max_distance_km, 1),
                "harvest_buffer_days": round(harvest_buffer_days, 2),
                "price_headroom": round(price_headroom, 4),
                "prior_buyer_share": round(prior_buyer_share, 4),
                "fulfilled": fulfilled,
            }
        )
    return rows


def main() -> None:
    rng = np.random.default_rng(SEED)
    rows = simulate(rng, N_ROWS)
    with OUT.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FEATURES + ["fulfilled"])
        writer.writeheader()
        writer.writerows(rows)
    positive = sum(r["fulfilled"] for r in rows)
    print(f"Wrote {len(rows)} synthetic rows to {OUT}")
    print(f"Fulfilment rate: {positive / len(rows):.1%}")


if __name__ == "__main__":
    main()
