export type QualityGrade = 'Premium' | 'Standard' | 'Processing';

/** Seller-provided condition of the lot. Not verified by the platform. */
export type ConditionGrade = 'Premium' | 'Standard' | 'Economy';

/** Buyer's minimum acceptable condition. 'Any' accepts every grade. */
export type MinimumCondition = 'Any' | 'Standard' | 'Premium';

/** One message in a buyer-to-seller conversation about a listed lot. */
export type ChatMessage = {
  id: string;
  harvestId: string;
  sender: 'buyer' | 'seller';
  text: string;
  sentAt: string;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type QualityAssessment = {
  grade: QualityGrade;
  visualScore: number;
  confidence: number;
  observations: string[];
  warning: string;
  source: 'openai' | 'demo';
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
  voiceUri?: string | null;
  notes?: string;
  assessment: QualityAssessment;
  isDemo?: boolean;
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

export type FarmEvaluation = {
  harvest: Harvest;
  eligible: boolean;
  score: number;
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
  /** Combination the plan is built from — the AI pick unless the buyer chose another. */
  selectedCombinationId: string | null;
  /** Metadata of the ML ranking model, for transparency in the UI. */
  modelInfo: RankingModelInfo | null;
  createdAt: string;
};

