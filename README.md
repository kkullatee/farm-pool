# farm-pool

B2B platform that pools produce from small farms so together they can fulfil
buyer orders none of them could satisfy alone.

- `mobile/` — Expo app (buyer + farmer flows, hybrid matching engine)
- `ml/` — training pipeline for the ranking model ([details](ml/README.md))
- `backend/` — optional FastAPI service for produce photo assessment and voice
  transcription (the app falls back to local logic without it)

## Matching architecture: rules for feasibility, ML for ranking

```
buyer request
  → STEP 1  deterministic filter      crop, variety, Brix, defects, firmness,
            (matching.ts)             harvest-by-delivery date — hard rules
  → STEP 2  candidate generation      enumerate minimal farm combinations that
            (candidates.ts)           cover the quantity; price ceiling enforced
  → STEP 3  ML ranking                logistic regression predicts fulfilment
            (ranking.ts)              probability for each feasible combination
  → top 3 recommended pools, each with score breakdown and top factors
```

Hard constraints are never delegated to the model: anything that fails a rule
is rejected before the ML layer runs, with the reason shown in the UI. The
model only orders the survivors — its probability is blended with two
deterministic sub-scores into the final ranking score
(`0.6 × P(fulfil) + 0.25 × logistics + 0.15 × buyer fit`).

The model is trained offline with scikit-learn on a **clearly-labelled
synthetic** fulfilment history (real data becomes a drop-in replacement) and
exported as plain coefficients to `mobile/src/lib/ranking-model.json`, so the
app runs it exactly and offline. Verify everything with:

```bash
cd mobile && npx tsx scripts/verify-pipeline.ts
```

## Run the app

```bash
cd mobile
npm install
npm start          # Expo Go
```

Optional AI backend (photo screening / voice transcription / listing extraction):

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Create `backend/.env` with the two keys the live AI features need:

```env
ELEVENLABS_API_KEY=...   # voice transcription
ANTHROPIC_API_KEY=...    # photo screening and listing extraction (Claude)
```

Without keys the app still works: photos go to manual review and the voice
flow offers a clearly labeled sample. Point the app at the backend with
`EXPO_PUBLIC_API_URL` in `mobile/.env`.
