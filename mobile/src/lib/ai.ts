import { File } from 'expo-file-system';

import {
  ConditionGrade,
  FarmEvaluation,
  MatchPlan,
  PoolCoordinatorResult,
  QualityAssessment,
  SelectedLot,
  VisualAssessment,
  VisualVerificationStatus,
  VoiceExtraction,
  VoiceField,
  VoiceFieldConfidence,
  VoiceListing,
} from './types';

export const backendUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? null;
const REQUEST_TIMEOUT_MS = 45_000;
const VOICE_FIELDS: VoiceField[] = [
  'crop',
  'variety',
  'quantity',
  'unit',
  'location',
  'harvest_date',
  'price_per_kg',
  'condition',
  'notes',
];

type AnalysisInput = {
  crop: string;
  variety: string;
  condition: ConditionGrade;
  notes: string;
  imageUri: string | null;
};

const apiUrl = backendUrl;

const emptyVoiceConfidence = (): VoiceFieldConfidence => ({
  crop: null,
  variety: null,
  quantity: null,
  unit: null,
  location: null,
  harvest_date: null,
  price_per_kg: null,
  condition: null,
  notes: null,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function clamp01(value: unknown, fallback: number) {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(1, Math.max(0, number));
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function stringArray(value: unknown, max = 6): string[] {
  return Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()))
        .slice(0, max)
    : [];
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function isCondition(value: unknown): value is ConditionGrade {
  return value === 'Premium' || value === 'Standard' || value === 'Economy';
}

function isPhotoStatus(value: unknown): QualityAssessment['photoStatus'] {
  return value === 'Accepted' || value === 'Retake required' || value === 'Manual review' || value === 'No photo'
    ? value
    : undefined;
}

function isVerificationStatus(value: unknown): value is VisualVerificationStatus {
  return value === 'ai-screened' || value === 'needs-review' || value === 'unverified';
}

function normaliseVisualAssessment(value: unknown): VisualAssessment | null {
  if (!isRecord(value)) return null;
  const verificationStatus = isVerificationStatus(value.verificationStatus)
    ? value.verificationStatus
    : 'needs-review';
  const source = value.source === 'anthropic' ? 'anthropic' : 'demo';
  return {
    containsProduce: value.containsProduce === true,
    inappropriateOrIrrelevant: value.inappropriateOrIrrelevant === true,
    detectedCrop: stringOrNull(value.detectedCrop),
    cropAgreesWithListing:
      typeof value.cropAgreesWithListing === 'boolean' ? value.cropAgreesWithListing : null,
    observations: stringArray(value.observations),
    damageOrDefectIndicators: stringArray(value.damageOrDefectIndicators),
    confidence: clamp01(value.confidence, 0),
    requiresAnotherPhoto: value.requiresAnotherPhoto === true,
    retakeReason: stringOrNull(value.retakeReason),
    verificationStatus,
    source,
    disclaimer:
      stringOrNull(value.disclaimer) ??
      'Visual assessment only: this photo does not prove Brix, internal quality, food safety, exact variety or freshness.',
  };
}

function localAssessment(input: AnalysisInput): QualityAssessment {
  const byCondition: Record<ConditionGrade, { grade: QualityAssessment['grade']; score: number }> =
    {
      Premium: { grade: 'Premium', score: 91 },
      Standard: { grade: 'Standard', score: 82 },
      Economy: { grade: 'Processing', score: 68 },
    };
  const { grade, score } = byCondition[input.condition];

  const observations = [
    input.imageUri ? 'Produce image captured for visual review' : 'No image supplied; confidence reduced',
    `Condition reported by the seller: ${input.condition}`,
  ];
  const visualAssessment: VisualAssessment = {
    containsProduce: Boolean(input.imageUri),
    inappropriateOrIrrelevant: false,
    detectedCrop: null,
    cropAgreesWithListing: null,
    observations: [
      input.imageUri ? 'Photo reference captured locally for review' : 'No photo supplied',
    ],
    damageOrDefectIndicators: [],
    confidence: input.imageUri ? 0.45 : 0,
    requiresAnotherPhoto: false,
    retakeReason: null,
    verificationStatus: input.imageUri ? 'needs-review' : 'unverified',
    source: 'demo',
    disclaimer:
      'Visual assessment only: this photo does not prove Brix, internal quality, food safety, exact variety or freshness.',
  };

  return {
    grade,
    visualScore: score,
    confidence: input.imageUri ? 0.84 : 0.64,
    observations,
    warning:
      'This is a preliminary screen based on seller-provided details. Buyers can ask the seller for more before confirming.',
    source: 'demo',
    // Without the AI check the photo cannot be verified, so it waits for manual
    // review and is never shown to buyers.
    photoStatus: input.imageUri ? 'Manual review' : 'No photo',
    photoChecks: input.imageUri
      ? ['AI photo check unavailable, photo held for manual review']
      : ['No photo supplied'],
    visualAssessment,
  };
}

function normaliseAssessment(value: unknown, input: AnalysisInput): QualityAssessment {
  if (!isRecord(value)) return localAssessment(input);
  const grade =
    value.grade === 'Premium' || value.grade === 'Standard' || value.grade === 'Processing'
      ? value.grade
      : localAssessment(input).grade;
  const source = value.source === 'anthropic' ? 'anthropic' : 'demo';
  return {
    grade,
    visualScore:
      typeof value.visualScore === 'number' && Number.isFinite(value.visualScore)
        ? Math.min(100, Math.max(0, Math.round(value.visualScore)))
        : localAssessment(input).visualScore,
    confidence: clamp01(value.confidence, source === 'anthropic' ? 0.5 : 0.4),
    observations: stringArray(value.observations, 8),
    warning:
      stringOrNull(value.warning) ??
      'This is a preliminary screen based on seller-provided details. Buyers can ask the seller for more before confirming.',
    source,
    photoStatus: isPhotoStatus(value.photoStatus) ?? (input.imageUri ? 'Manual review' : 'No photo'),
    photoChecks: stringArray(value.photoChecks, 8),
    visualAssessment: normaliseVisualAssessment(value.visualAssessment),
  };
}

export async function analyseProduce(input: AnalysisInput): Promise<QualityAssessment> {
  if (!apiUrl) return { ...localAssessment(input), aiStatus: 'demo-fallback' };

  try {
    const body = new FormData();
    body.append('crop', input.crop);
    body.append('variety', input.variety);
    body.append('condition', input.condition);
    body.append('notes', input.notes);
    if (input.imageUri) {
      body.append('file', new File(input.imageUri), 'produce.jpg');
    }

    const response = await fetchWithTimeout(`${apiUrl}/analyse-produce`, {
      method: 'POST',
      body,
    });
    if (!response.ok) throw new Error(`Analysis failed with ${response.status}`);
    const result = normaliseAssessment(await response.json(), input);
    // The backend answers with source 'anthropic' when the vision model really
    // ran, and 'demo' when it could not (no key, model error). Keep that
    // distinction visible instead of pretending both are the same.
    if (result.source === 'anthropic') return { ...result, aiStatus: 'live' };
    return { ...result, aiStatus: 'vision-unavailable' };
  } catch {
    return { ...localAssessment(input), aiStatus: 'backend-unreachable' };
  }
}

/** Demo fallback so the voice flow always works, clearly labeled as a sample. */
export function demoVoiceListing(): VoiceListing {
  return {
    status: 'demo',
    note: 'Sample data. No backend is configured, so this is not your recording.',
    transcript:
      'Sample transcript: about two thousand kilos of Kensington Pride mangoes from Mareeba, ' +
      'ready around the twenty first, asking three dollars a kilo, top quality batch.',
    extraction: {
      crop: 'Mango',
      variety: 'Kensington Pride',
      quantity: 2000,
      unit: 'kg',
      location: 'Mareeba, QLD',
      harvest_date: null,
      price_per_kg: 3,
      condition: 'Premium',
      notes: 'Farmer says it is a top quality batch.',
      field_confidence: {
        ...emptyVoiceConfidence(),
        crop: 0.96,
        variety: 0.92,
        quantity: 0.91,
        unit: 0.89,
        location: 0.94,
        price_per_kg: 0.86,
        condition: 0.72,
        notes: 0.83,
      },
      uncertain: ['condition'],
      missing: ['harvest_date'],
      ambiguous: ['condition'],
      conflicts: [],
      follow_up_questions: ['What date should buyers expect this harvest to be ready?'],
    },
    transcriptSource: 'demo',
    extractionSource: 'demo',
  };
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normaliseVoiceFields(value: unknown): VoiceField[] {
  return Array.isArray(value)
    ? value.filter((field): field is VoiceField => VOICE_FIELDS.includes(field as VoiceField))
    : [];
}

function normaliseVoiceConfidence(value: unknown, extraction: Record<string, unknown>) {
  const raw = isRecord(value) ? value : {};
  const confidence = emptyVoiceConfidence();
  VOICE_FIELDS.forEach((field) => {
    if (extraction[field] !== null && extraction[field] !== undefined) {
      confidence[field] = typeof raw[field] === 'number' ? clamp01(raw[field], 0) : null;
    }
  });
  return confidence;
}

function normaliseVoiceExtraction(value: unknown): VoiceExtraction | null {
  if (!isRecord(value)) return null;
  const unit: VoiceExtraction['unit'] =
    value.unit === 'kg' || value.unit === 'tonnes' || value.unit === 'crates' || value.unit === 'pallets'
      ? value.unit
      : null;
  const condition = isCondition(value.condition) ? value.condition : null;
  const extraction = {
    crop: stringOrNull(value.crop),
    variety: stringOrNull(value.variety),
    quantity: numberOrNull(value.quantity),
    unit,
    location: stringOrNull(value.location),
    harvest_date: stringOrNull(value.harvest_date),
    price_per_kg: numberOrNull(value.price_per_kg),
    condition,
    notes: stringOrNull(value.notes),
  };

  return {
    ...extraction,
    field_confidence: normaliseVoiceConfidence(value.field_confidence, extraction),
    uncertain: normaliseVoiceFields(value.uncertain),
    missing: normaliseVoiceFields(value.missing),
    ambiguous: normaliseVoiceFields(value.ambiguous),
    conflicts: stringArray(value.conflicts),
    follow_up_questions: stringArray(value.follow_up_questions, 5),
  };
}

function voiceFailure(
  status: VoiceListing['status'],
  note: string,
  transcript: string | null = null,
): VoiceListing {
  return {
    status,
    note,
    transcript,
    extraction: null,
    transcriptSource: transcript ? 'elevenlabs' : 'unavailable',
    extractionSource: 'unavailable',
  };
}

/**
 * Voice to listing: sends the recording to the backend, which transcribes it
 * (ElevenLabs) and extracts listing fields with Claude.
 * Falls back to a clearly labeled sample when no backend is configured, so the
 * demo flow always works.
 */
export async function voiceToListing(uri: string): Promise<VoiceListing> {
  // No backend configured: the demo sample is intentional and says so.
  if (!apiUrl) return demoVoiceListing();

  try {
    const body = new FormData();
    body.append('file', new File(uri), 'harvest-note.m4a');
    const response = await fetchWithTimeout(`${apiUrl}/voice-to-listing`, { method: 'POST', body }, 70_000);
    if (!response.ok) throw new Error(`Voice listing failed with ${response.status}`);
    const result = (await response.json()) as {
      transcript: string | null;
      extraction: unknown;
      transcript_source: 'elevenlabs' | 'unavailable';
      extraction_source: 'claude' | 'unavailable';
    };

    // Backend reached but transcription failed: never substitute the sample.
    if (!result.transcript) {
      return voiceFailure(
        'stt-failed',
        'The backend is running but transcription failed. Check the ElevenLabs key in backend/.env.',
      );
    }

    const extraction = normaliseVoiceExtraction(result.extraction);
    // Real transcript but extraction failed: show the words, fill nothing.
    if (!extraction) {
      return {
        status: 'extraction-failed',
        note: 'Transcribed live, but field extraction failed. Check the Anthropic key in backend/.env and fill the form manually.',
        transcript: result.transcript,
        extraction: null,
        transcriptSource: result.transcript_source,
        extractionSource: 'unavailable',
      };
    }

    return {
      status: 'live',
      note: `Live transcription (${result.transcript_source}) and extraction (${result.extraction_source}).`,
      transcript: result.transcript,
      extraction,
      transcriptSource: result.transcript_source,
      extractionSource: result.extraction_source,
    };
  } catch (error) {
    return {
      status: 'backend-unreachable',
      note: `Could not send the recording to the backend at ${apiUrl}. Check the server is running, then try again. (${String(error)})`,
      transcript: null,
      extraction: null,
      transcriptSource: 'unavailable',
      extractionSource: 'unavailable',
    };
  }
}

export async function extractListingFromTranscript(transcript: string): Promise<VoiceListing> {
  const cleaned = transcript.trim();
  if (!cleaned) {
    return voiceFailure('extraction-failed', 'Add transcript text before asking FarmPool to read it again.');
  }
  if (!apiUrl) {
    return {
      status: 'extraction-failed',
      note: 'No backend is configured, so the corrected transcript stays visible but cannot be extracted live.',
      transcript: cleaned,
      extraction: null,
      transcriptSource: 'unavailable',
      extractionSource: 'unavailable',
    };
  }

  try {
    const response = await fetchWithTimeout(`${apiUrl}/extract-listing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: cleaned }),
    });
    if (!response.ok) throw new Error(`Transcript extraction failed with ${response.status}`);
    const result = (await response.json()) as {
      transcript: string | null;
      extraction: unknown;
      transcript_source: 'elevenlabs' | 'unavailable';
      extraction_source: 'claude' | 'unavailable';
    };
    const extraction = normaliseVoiceExtraction(result.extraction);
    if (!extraction) {
      return {
        status: 'extraction-failed',
        note: 'FarmPool could not extract reliable listing fields from the corrected transcript.',
        transcript: result.transcript ?? cleaned,
        extraction: null,
        transcriptSource: 'unavailable',
        extractionSource: 'unavailable',
      };
    }
    return {
      status: 'live',
      note: `Corrected transcript extracted with ${result.extraction_source}.`,
      transcript: result.transcript ?? cleaned,
      extraction,
      transcriptSource: 'unavailable',
      extractionSource: result.extraction_source,
    };
  } catch (error) {
    return {
      status: 'backend-unreachable',
      note: `Could not send the corrected transcript to the backend at ${apiUrl}. (${String(error)})`,
      transcript: cleaned,
      extraction: null,
      transcriptSource: 'unavailable',
      extractionSource: 'unavailable',
    };
  }
}

export async function transcribeVoice(uri: string | null): Promise<string | null> {
  if (!apiUrl || !uri) return null;

  try {
    const body = new FormData();
    body.append('file', new File(uri), 'harvest-note.m4a');
    const response = await fetchWithTimeout(`${apiUrl}/transcribe`, { method: 'POST', body }, 70_000);
    if (!response.ok) return null;
    const result = (await response.json()) as { text?: string };
    return result.text ?? null;
  } catch {
    return null;
  }
}

function visualStatusForLot(lot: SelectedLot | FarmEvaluation): VisualVerificationStatus | null {
  return lot.harvest.assessment.visualAssessment?.verificationStatus ?? null;
}

function lotForCoordinator(lot: SelectedLot | FarmEvaluation) {
  return {
    farmerName: lot.harvest.farmerName,
    crop: lot.harvest.crop,
    variety: lot.harvest.variety,
    allocatedKg: 'allocatedKg' in lot ? lot.allocatedKg : null,
    availableKg: lot.harvest.quantityKg,
    location: lot.harvest.location,
    harvestDate: lot.harvest.harvestDate,
    condition: lot.harvest.condition,
    verification: lot.harvest.verification ?? 'Self-reported',
    reliability: lot.harvest.reliability,
    onTimePct: lot.harvest.onTimePct ?? null,
    pricePerKg: lot.harvest.minimumPricePerKg,
    distanceKm: lot.distanceKm,
    reasons: lot.reasons,
    visualVerificationStatus: visualStatusForLot(lot),
  };
}

function planPayload(plan: MatchPlan) {
  return {
    order: {
      businessName: plan.order.businessName,
      crop: plan.order.crop,
      variety: plan.order.variety,
      quantityKg: plan.order.quantityKg,
      deliveryLocation: plan.order.deliveryLocation,
      deliveryDate: plan.order.deliveryDate,
      maximumDeliveredPricePerKg: plan.order.maximumDeliveredPricePerKg,
      minimumCondition: plan.order.minimumCondition,
    },
    selectedLots: plan.selected.map(lotForCoordinator),
    rejectedLots: plan.rejected.map(lotForCoordinator),
    reserveLots: plan.eligibleNotNeeded.map(lotForCoordinator),
    rankedCombinations: plan.rankedCombinations.map((combo) => ({
      id: combo.id,
      rank: combo.rank,
      farmNames: combo.lots.map((lot) => lot.harvest.farmerName),
      fulfilledKg: combo.fulfilledKg,
      deliveredPerKg: combo.cost.deliveredPerKg,
      totalCost: combo.cost.total,
      withinBudget: combo.withinBudget,
      fulfilmentProbability: combo.fulfilmentProbability,
      logisticsScore: combo.logisticsScore,
      buyerFitScore: combo.buyerFitScore,
      finalScore: combo.finalScore,
      explanation: combo.explanation,
    })),
    requestedKg: plan.requestedKg,
    fulfilledKg: plan.fulfilledKg,
    fillRate: plan.fillRate,
    deliveredPerKg: plan.cost.deliveredPerKg,
    totalCost: plan.cost.total,
    withinBudget: plan.withinBudget,
    withinPriceCeiling: plan.withinPriceCeiling,
  };
}

function localPoolCoordination(
  plan: MatchPlan,
  aiStatus: PoolCoordinatorResult['aiStatus'],
): PoolCoordinatorResult {
  const complete = plan.fulfilledKg >= plan.requestedKg;
  const selectedNames = plan.selected.map((lot) => lot.harvest.farmerName).join(', ') || 'no farms';
  const adjustmentSuggestions: string[] = [];
  if (!complete) {
    adjustmentSuggestions.push(
      `Request ${Math.max(0, plan.requestedKg - plan.fulfilledKg).toLocaleString()} kg more supply.`,
    );
    adjustmentSuggestions.push('Try a later delivery date to include farms harvesting after this window.');
  }
  if (!plan.withinPriceCeiling) {
    adjustmentSuggestions.push('Confirm a higher delivered price limit before choosing an over-ceiling pool.');
  }
  if (plan.rejected.length > 0) {
    adjustmentSuggestions.push('Change variety, condition or date requirements only after buyer confirmation.');
  }

  return {
    source: 'demo',
    aiStatus,
    approvalRequired: true,
    recommendation: complete
      ? plan.withinBudget
        ? 'FarmPool recommends the current top-ranked feasible pool, pending buyer approval and seller confirmation.'
        : 'A complete pool exists but it is above the buyer price target, so it needs explicit price approval.'
      : 'No complete pool exists yet. Use this as a partial supply lead list and adjust requirements before approval.',
    confidence: plan.rankedCombinations.length ? 0.68 : 0.54,
    evidence: [
      `${plan.rankedCombinations.length} complete candidate pool(s) were tested after hard rules ran.`,
      `${selectedNames} make up the current selected plan.`,
      `${plan.fulfilledKg.toLocaleString()} kg of ${plan.requestedKg.toLocaleString()} kg is covered.`,
    ],
    tradeoffs: [
      'Costs, quantities, route distance and price ceiling checks are deterministic.',
      'The local ranking model orders feasible pools by fulfilment risk, logistics and buyer fit.',
    ],
    selectedReason: plan.selected.slice(0, 4).map(
      (lot) =>
        `${lot.harvest.farmerName}: ${lot.harvest.condition} condition, ${lot.harvest.reliability}% reliability, ${lot.distanceKm} km away.`,
    ),
    excludedReason: plan.rejected.slice(0, 4).map(
      (lot) => `${lot.harvest.farmerName}: ${lot.reasons.join('; ')}`,
    ),
    adjustmentSuggestions,
  };
}

function normaliseCoordinatorResult(
  value: unknown,
  fallback: PoolCoordinatorResult,
): PoolCoordinatorResult {
  if (!isRecord(value)) return fallback;
  const source = value.source === 'claude' ? 'claude' : 'demo';
  return {
    source,
    aiStatus: source === 'claude' ? 'live' : 'coordinator-unavailable',
    approvalRequired: true,
    recommendation: stringOrNull(value.recommendation) ?? fallback.recommendation,
    confidence: clamp01(value.confidence, fallback.confidence),
    evidence: stringArray(value.evidence),
    tradeoffs: stringArray(value.tradeoffs),
    selectedReason: stringArray(value.selectedReason),
    excludedReason: stringArray(value.excludedReason),
    adjustmentSuggestions: stringArray(value.adjustmentSuggestions),
  };
}

export async function coordinatePoolPlan(plan: MatchPlan): Promise<PoolCoordinatorResult> {
  if (!apiUrl) return localPoolCoordination(plan, 'demo-fallback');

  const fallback = localPoolCoordination(plan, 'backend-unreachable');
  try {
    const response = await fetchWithTimeout(`${apiUrl}/coordinate-pool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planPayload(plan)),
    });
    if (!response.ok) throw new Error(`Pool coordination failed with ${response.status}`);
    return normaliseCoordinatorResult(await response.json(), fallback);
  } catch {
    return fallback;
  }
}
