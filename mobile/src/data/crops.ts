/**
 * Crop catalog: powers the searchable crop selector, crop-dependent variety
 * options, quantity-unit conversions and plausibility checks (typical price,
 * lot size and harvest season). Values are indicative Queensland farm-gate
 * figures for the hackathon prototype — replace with a managed catalog later.
 */

export type ProduceCategory =
  | 'Sweet fruit'
  | 'Non-sweet fruit'
  | 'Leafy vegetables'
  | 'Root vegetables';

export type CropInfo = {
  name: string;
  category: ProduceCategory;
  varieties: string[];
  /** Typical farm-gate price band, AUD per kg. Values outside trigger a warning. */
  typicalPricePerKg: [number, number];
  /** Typical single-farm lot size band in kg. Values outside trigger a warning. */
  typicalLotKg: [number, number];
  /** Approximate weight of one field crate, kg. */
  crateKg: number;
  /** Approximate weight of one pallet, kg. */
  palletKg: number;
  /** Usual harvest months in QLD (1-12). Empty = year-round, never warns. */
  seasonMonths: number[];
};

export const OTHER_VARIETY = 'Other variety';

export const CROPS: CropInfo[] = [
  {
    name: 'Mango',
    category: 'Sweet fruit',
    varieties: ['Kensington Pride', 'R2E2', 'Calypso', 'Honey Gold', 'Keitt'],
    typicalPricePerKg: [2, 6],
    typicalLotKg: [300, 30000],
    crateKg: 20,
    palletKg: 600,
    seasonMonths: [9, 10, 11, 12, 1, 2],
  },
  {
    name: 'Banana',
    category: 'Sweet fruit',
    varieties: ['Cavendish', 'Lady Finger', 'Ducasse'],
    typicalPricePerKg: [1, 3.5],
    typicalLotKg: [500, 40000],
    crateKg: 13,
    palletKg: 700,
    seasonMonths: [],
  },
  {
    name: 'Strawberry',
    category: 'Sweet fruit',
    varieties: ['Red Rhapsody', 'Sundrench', 'Festival', 'Albion'],
    typicalPricePerKg: [6, 14],
    typicalLotKg: [50, 8000],
    crateKg: 8,
    palletKg: 400,
    seasonMonths: [5, 6, 7, 8, 9, 10],
  },
  {
    name: 'Watermelon',
    category: 'Sweet fruit',
    varieties: ['Seedless', 'Champagne', 'Fireball'],
    typicalPricePerKg: [0.5, 1.8],
    typicalLotKg: [1000, 60000],
    crateKg: 25,
    palletKg: 800,
    seasonMonths: [10, 11, 12, 1, 2, 3],
  },
  {
    name: 'Pineapple',
    category: 'Sweet fruit',
    varieties: ['Smooth Cayenne', 'MD2', 'Bethonga Gold'],
    typicalPricePerKg: [1, 3],
    typicalLotKg: [500, 30000],
    crateKg: 18,
    palletKg: 650,
    seasonMonths: [],
  },
  {
    name: 'Tomato',
    category: 'Non-sweet fruit',
    varieties: ['Gourmet', 'Roma', 'Cherry', 'Truss', 'Heirloom'],
    typicalPricePerKg: [2, 6.5],
    typicalLotKg: [200, 25000],
    crateKg: 12,
    palletKg: 550,
    seasonMonths: [],
  },
  {
    name: 'Avocado',
    category: 'Non-sweet fruit',
    varieties: ['Hass', 'Shepard', 'Wurtz'],
    typicalPricePerKg: [2, 7],
    typicalLotKg: [200, 25000],
    crateKg: 10,
    palletKg: 500,
    seasonMonths: [2, 3, 4, 5, 6, 7, 8],
  },
  {
    name: 'Cucumber',
    category: 'Non-sweet fruit',
    varieties: ['Continental', 'Lebanese', 'Green Gem'],
    typicalPricePerKg: [1.5, 4.5],
    typicalLotKg: [200, 20000],
    crateKg: 10,
    palletKg: 500,
    seasonMonths: [],
  },
  {
    name: 'Capsicum',
    category: 'Non-sweet fruit',
    varieties: ['Red', 'Green', 'Yellow', 'Mini'],
    typicalPricePerKg: [2.5, 7],
    typicalLotKg: [200, 20000],
    crateKg: 8,
    palletKg: 450,
    seasonMonths: [],
  },
  {
    name: 'Zucchini',
    category: 'Non-sweet fruit',
    varieties: ['Blackjack', 'Golden', 'Lebanese'],
    typicalPricePerKg: [1.5, 5],
    typicalLotKg: [200, 15000],
    crateKg: 9,
    palletKg: 450,
    seasonMonths: [],
  },
  {
    name: 'Lettuce',
    category: 'Leafy vegetables',
    varieties: ['Iceberg', 'Cos', 'Butter', 'Oak Leaf'],
    typicalPricePerKg: [1.5, 4.5],
    typicalLotKg: [100, 15000],
    crateKg: 6,
    palletKg: 300,
    seasonMonths: [],
  },
  {
    name: 'Spinach',
    category: 'Leafy vegetables',
    varieties: ['Baby Spinach', 'English', 'Silverbeet'],
    typicalPricePerKg: [4, 12],
    typicalLotKg: [50, 8000],
    crateKg: 4,
    palletKg: 250,
    seasonMonths: [],
  },
  {
    name: 'Kale',
    category: 'Leafy vegetables',
    varieties: ['Curly', 'Tuscan', 'Red Russian'],
    typicalPricePerKg: [3, 10],
    typicalLotKg: [50, 8000],
    crateKg: 5,
    palletKg: 250,
    seasonMonths: [],
  },
  {
    name: 'Cabbage',
    category: 'Leafy vegetables',
    varieties: ['Green', 'Red', 'Savoy', 'Wombok'],
    typicalPricePerKg: [0.8, 2.5],
    typicalLotKg: [300, 25000],
    crateKg: 15,
    palletKg: 600,
    seasonMonths: [],
  },
  {
    name: 'Carrot',
    category: 'Root vegetables',
    varieties: ['Nantes', 'Baby', 'Purple', 'Juicing'],
    typicalPricePerKg: [0.6, 2.2],
    typicalLotKg: [500, 40000],
    crateKg: 15,
    palletKg: 750,
    seasonMonths: [],
  },
  {
    name: 'Potato',
    category: 'Root vegetables',
    varieties: ['Sebago', 'Desiree', 'Kipfler', 'Brushed'],
    typicalPricePerKg: [0.5, 2],
    typicalLotKg: [1000, 60000],
    crateKg: 18,
    palletKg: 900,
    seasonMonths: [],
  },
  {
    name: 'Sweet potato',
    category: 'Root vegetables',
    varieties: ['Gold', 'Purple', 'White'],
    typicalPricePerKg: [1, 3.5],
    typicalLotKg: [500, 40000],
    crateKg: 16,
    palletKg: 800,
    seasonMonths: [],
  },
  {
    name: 'Onion',
    category: 'Root vegetables',
    varieties: ['Brown', 'Red', 'White', 'Shallot'],
    typicalPricePerKg: [0.5, 2],
    typicalLotKg: [500, 50000],
    crateKg: 18,
    palletKg: 850,
    seasonMonths: [],
  },
  {
    name: 'Beetroot',
    category: 'Root vegetables',
    varieties: ['Boltardy', 'Baby', 'Golden'],
    typicalPricePerKg: [1, 3],
    typicalLotKg: [200, 20000],
    crateKg: 14,
    palletKg: 650,
    seasonMonths: [],
  },
];

export function cropInfo(name: string): CropInfo | undefined {
  const wanted = name.trim().toLowerCase();
  return CROPS.find((crop) => crop.name.toLowerCase() === wanted);
}

export type QuantityUnit = 'kg' | 'tonnes' | 'crates' | 'pallets';

export const QUANTITY_UNITS: readonly QuantityUnit[] = ['kg', 'tonnes', 'crates', 'pallets'];

/** Convert an entered quantity to canonical kg. Crate/pallet weights are per-crop estimates. */
export function toKg(value: number, unit: QuantityUnit, crop?: CropInfo): number {
  switch (unit) {
    case 'kg':
      return value;
    case 'tonnes':
      return value * 1000;
    case 'crates':
      return value * (crop?.crateKg ?? 15);
    case 'pallets':
      return value * (crop?.palletKg ?? 500);
  }
}

/** Whether the kg figure is exact or an estimate from container counts. */
export function isEstimatedUnit(unit: QuantityUnit): boolean {
  return unit === 'crates' || unit === 'pallets';
}
