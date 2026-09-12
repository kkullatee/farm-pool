export type Firmness = 'Soft' | 'Medium' | 'Firm';
export type QualityGrade = 'Premium' | 'Standard' | 'Processing';

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
  brix: number;
  defectsPct: number;
  firmness: Firmness;
  reliability: number;
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
  minimumBrix: number;
  maximumDefectsPct: number;
  firmness: Firmness;
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

export type MatchPlan = {
  order: BuyerOrder;
  selected: SelectedLot[];
  rejected: FarmEvaluation[];
  eligibleNotNeeded: FarmEvaluation[];
  requestedKg: number;
  fulfilledKg: number;
  fillRate: number;
  weightedBrix: number;
  weightedDefects: number;
  cost: CostBreakdown;
  withinBudget: boolean;
  createdAt: string;
};

