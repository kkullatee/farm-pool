export type QualityGrade = 'Premium' | 'Standard' | 'Processing';

/** Seller-provided condition of the lot. Not verified by the platform. */
export type ConditionGrade = 'Premium' | 'Standard' | 'Economy';

/** How far this seller's account has been verified. New sellers start self-reported. */
export type VerificationLevel =
  | 'Self-reported'
  | 'Identity verified'
  | 'Business verified'
  | 'Physically verified';

/** Buyer's minimum acceptable condition. 'Any' accepts every grade. */
export type MinimumCondition = 'Any' | 'Standard' | 'Premium';

/** Which side of the market the demo device is currently acting as. */
export type DemoRole = 'buyer' | 'seller';

/** One message in a buyer-to-seller conversation about a listed lot. */
export type ChatMessage = {
  id: string;
  harvestId: string;
  sender: DemoRole;
  text: string;
  sentAt: string;
};

export type SellerResponse = 'Pending' | 'Accepted' | 'Declined';

/** A per-seller order request created when the buyer approves a pooled order.
 * Carries its own display data so it stays valid even if the plan changes. */
export type OrderRequest = {
  id: string;
  orderId: string;
  harvestId: string;
  farmerName: string;
  buyerName: string;
  crop: string;
  variety: string;
  allocatedKg: number;
  pricePerKg: number;
  deliveryDate: string;
  deliveryLocation: string;
  status: SellerResponse;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type PhotoStatus = 'Accepted' | 'Retake required' | 'Manual review' | 'No photo';
export type VisualVerificationStatus = 'ai-screened' | 'needs-review' | 'unverified';

export type VisualAssessment = {
  containsProduce: boolean;
  inappropriateOrIrrelevant: boolean;
  detectedCrop: string | null;
  cropAgreesWithListing: boolean | null;
  observations: string[];
  damageOrDefectIndicators: string[];
  confidence: number;
  requiresAnotherPhoto: boolean;
  retakeReason: string | null;
  verificationStatus: VisualVerificationStatus;
  source: 'anthropic' | 'demo';
  disclaimer: string;
};

export type PhotoReference = {
  /** Prototype only: local URI. TODO replace with durable object storage before production. */
  uri: string;
  storage: 'local-device';
  note: string;
};

export type QualityAssessment = {
  grade: QualityGrade;
  visualScore: number;
  confidence: number;
  observations: string[];
  warning: string;
  source: 'anthropic' | 'demo';
  /** Photo screening result. Anything except Accepted is never shown to buyers. */
  photoStatus?: PhotoStatus;
  photoChecks?: string[];
  /** Visual-only screen. Does not prove Brix, internal quality, food safety or freshness. */
  visualAssessment?: VisualAssessment | null;
  /** How this assessment was produced. Set client-side, never faked. */
  aiStatus?: 'live' | 'demo-fallback' | 'backend-unreachable' | 'vision-unavailable';
};

export type VoiceField =
  | 'crop'
  | 'variety'
  | 'quantity'
  | 'unit'
  | 'location'
  | 'harvest_date'
  | 'price_per_kg'
  | 'condition'
  | 'notes';

export type VoiceFieldConfidence = Record<VoiceField, number | null>;

/** Listing fields extracted from a spoken harvest description. */
export type VoiceExtraction = {
  crop: string | null;
  variety: string | null;
  quantity: number | null;
  unit: 'kg' | 'tonnes' | 'crates' | 'pallets' | null;
  location: string | null;
  harvest_date: string | null;
  price_per_kg: number | null;
  condition: ConditionGrade | null;
  notes: string | null;
  field_confidence: VoiceFieldConfidence;
  uncertain: VoiceField[];
  missing: VoiceField[];
  ambiguous: VoiceField[];
  conflicts: string[];
  follow_up_questions: string[];
};

/** Exactly what happened on a voice autofill attempt. Never ambiguous. */
export type VoiceStatus =
  | 'live'
  | 'demo'
  | 'backend-unreachable'
  | 'stt-failed'
  | 'extraction-failed';

export type VoiceListing = {
  status: VoiceStatus;
  transcript: string | null;
  extraction: VoiceExtraction | null;
  transcriptSource: 'elevenlabs' | 'demo' | 'unavailable';
  extractionSource: 'claude' | 'demo' | 'unavailable';
  /** Plain-language detail for the UI, e.g. which part failed and why. */
  note: string;
};

export type Harvest = {
  id: string;
  farmerName: string;
  crop: string;
  variety: string;
  quantityKg: number;
  location: string;
  coordinates: Coordinates;
  harvestDate: string;
  minimumPricePerKg: number;
  /** Seller-provided condition grade. Confirmed with the seller, not lab-tested. */
  condition: ConditionGrade;
  /** Seller account verification level. Defaults to Self-reported. */
  verification?: VerificationLevel;
  reliability: number;
  /** Historical on-time delivery rate 0-100. Defaults to reliability when unknown. */
  onTimePct?: number;
  /** Pooled orders this farm has completed on FarmPool. */
  completedPools?: number;
  /** Business names this farm has previously supplied successfully. */
  pastBuyers?: string[];
  /** True when the variety is outside the catalog and awaits catalog review. */
  needsReview?: boolean;
  /** True when quantity was entered in containers and converted to estimated kg. */
  quantityEstimated?: boolean;
  imageUri?: string | null;
  photoReference?: PhotoReference | null;
  voiceUri?: string | null;
  notes?: string;
  qualityAnswers?: QualityAnswer[];
  assessment: QualityAssessment;
  isDemo?: boolean;
};

export type QualityQuestionKind = 'choice' | 'number' | 'text';

export type QualityQuestion = {
  id: string;
  label: string;
  kind: QualityQuestionKind;
  hint?: string;
  unit?: string;
  options?: string[];
  allowUnknown: boolean;
};

export type QualityAnswer = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  selfReported: true;
};

export type BuyerOrder = {
  id: string;
  businessName: string;
  crop: string;
  variety: string;
  quantityKg: number;
  deliveryLocation: string;
  coordinates: Coordinates;
  deliveryDate: string;
  maximumDeliveredPricePerKg: number;
  /** Lowest seller-provided condition grade the buyer accepts. */
  minimumCondition: MinimumCondition;
};

/** Rules-based parts of a farm's match score, each 0-100. */
export type MatchBreakdown = {
  condition: number;
  timing: number;
  distance: number;
  price: number;
  reliability: number;
};

export type FarmEvaluation = {
  harvest: Harvest;
  eligible: boolean;
  /** Rules-based match score 0-100, the weighted blend of `breakdown`. */
  score: number;
  breakdown: MatchBreakdown;
  distanceKm: number;
  reasons: string[];
};

export type SelectedLot = FarmEvaluation & {
  allocatedKg: number;
};

export type CostBreakdown = {
  produce: number;
  dispatch: number;
  distance: number;
  coldChain: number;
  handling: number;
  qualityTesting: number;
  platform: number;
  total: number;
  deliveredPerKg: number;
  routeKm: number;
  trucks: number;
};

/** One feature's contribution to the ML fulfilment prediction (log-odds space). */
export type FactorContribution = {
  feature: string;
  label: string;
  value: number;
  contribution: number;
  direction: 'positive' | 'negative';
};

/** A feasible farm combination scored by the hybrid ranker. */
export type RankedCombination = {
  id: string;
  rank: number;
  lots: SelectedLot[];
  fulfilledKg: number;
  cost: CostBreakdown;
  withinBudget: boolean;
  /** ML: predicted probability this combination fulfils the order (logistic regression). */
  fulfilmentProbability: number;
  /** Deterministic: route efficiency and truck utilisation, 0-1. */
  logisticsScore: number;
  /** Deterministic: quality margin, price headroom and buyer history, 0-1. */
  buyerFitScore: number;
  /** Blend: 0.6 x fulfilment probability + 0.25 x logistics + 0.15 x buyer fit. */
  finalScore: number;
  topFactors: FactorContribution[];
  explanation: string;
  features: Record<string, number>;
};

export type RankingModelInfo = {
  modelType: string;
  library: string;
  auc: number;
  trainedRows: number;
  dataSource: string;
};

/** A completed order outcome, stored in the training-data schema so real
 * marketplace history can replace the synthetic bootstrap data. */
export type FulfilmentRecord = {
  orderId: string;
  /** The winning combination's model features at approval time. */
  features: Record<string, number>;
  fulfilled: boolean;
  onTime: boolean;
  sellerDropout: boolean;
};

export type MatchPlan = {
  order: BuyerOrder;
  selected: SelectedLot[];
  rejected: FarmEvaluation[];
  eligibleNotNeeded: FarmEvaluation[];
  requestedKg: number;
  fulfilledKg: number;
  fillRate: number;
  cost: CostBreakdown;
  withinBudget: boolean;
  /** Top feasible combinations ordered by the hybrid ranking score. */
  rankedCombinations: RankedCombination[];
  /** False when no pool meets the buyer's price ceiling; the list then holds
   * closest alternatives, not recommendations. */
  withinPriceCeiling: boolean;
  /** Combination the plan is built from — the AI pick unless the buyer chose another. */
  selectedCombinationId: string | null;
  /** Metadata of the ML ranking model, for transparency in the UI. */
  modelInfo: RankingModelInfo | null;
  createdAt: string;
};

export type PoolCoordinatorResult = {
  recommendation: string;
  confidence: number;
  evidence: string[];
  tradeoffs: string[];
  selectedReason: string[];
  excludedReason: string[];
  adjustmentSuggestions: string[];
  source: 'claude' | 'demo';
  approvalRequired: boolean;
  aiStatus: 'live' | 'demo-fallback' | 'backend-unreachable' | 'coordinator-unavailable';
};
