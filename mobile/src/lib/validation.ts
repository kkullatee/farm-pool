import { CropInfo, OTHER_VARIETY } from '@/data/crops';

/**
 * Input validation for the seller and buyer forms.
 *
 * Two tiers, deliberately separate:
 *  - errors:   hard blockers shown beside the field (missing, non-numeric,
 *              outside sensible physical limits). These stop submission.
 *  - warnings: unusual-but-possible values (price far off the typical band,
 *              out-of-season dates, oversized lot). These never auto-reject.
 *              The seller or buyer sees them once and can confirm and proceed.
 */

export type FieldErrors = Record<string, string>;

export type ValidationResult = {
  errors: FieldErrors;
  warnings: string[];
};

// Physical sanity ceilings (hard errors), generous on purpose.
const MAX_LOT_KG = 200_000; // 200 t from a single listing
const MAX_ORDER_KG = 500_000;
const MAX_PRICE_PER_KG = 100;

const isBlank = (value: string) => !value.trim();

function checkNumber(
  errors: FieldErrors,
  field: string,
  raw: string,
  label: string,
  { min, max, allowZero = false }: { min: number; max: number; allowZero?: boolean },
): number | null {
  if (isBlank(raw)) {
    errors[field] = `${label} is required.`;
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    errors[field] = `${label} must be a number.`;
    return null;
  }
  if (!allowZero && value <= 0) {
    errors[field] = `${label} must be greater than zero.`;
    return null;
  }
  if (value < min || value > max) {
    errors[field] = `${label} must be between ${min} and ${max}.`;
    return null;
  }
  return value;
}

function requireField(errors: FieldErrors, field: string, raw: string, message: string) {
  if (isBlank(raw)) errors[field] = message;
}

const monthName = (month: number) =>
  [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ][month - 1];

function seasonWarning(crop: CropInfo, isoDate: string, what: string): string | null {
  if (!crop.seasonMonths.length) return null;
  const month = Number(isoDate.slice(5, 7));
  if (!month || crop.seasonMonths.includes(month)) return null;
  return `${monthName(month)} is outside the usual ${crop.name.toLowerCase()} season here. Double-check the ${what}, or explain in the notes.`;
}

export function validateHarvest(input: {
  farmerName: string;
  crop: string;
  variety: string;
  otherVariety: string;
  quantityRaw: string;
  quantityKg: number;
  quantityEstimated: boolean;
  location: string;
  harvestDate: string;
  priceRaw: string;
  cropInfo?: CropInfo;
  existingListings?: { farmerName: string; crop: string; variety: string; harvestDate: string }[];
}): ValidationResult {
  const errors: FieldErrors = {};
  const warnings: string[] = [];

  requireField(errors, 'farmerName', input.farmerName, 'Farm name is required.');
  requireField(errors, 'crop', input.crop, 'Pick the crop you are listing.');
  requireField(errors, 'variety', input.variety, 'Pick a variety (or "Other variety").');
  if (input.variety === OTHER_VARIETY && isBlank(input.otherVariety)) {
    errors.otherVariety = 'Type the variety name so our team can review it.';
  }
  requireField(errors, 'location', input.location, 'Farm location is required.');
  requireField(errors, 'harvestDate', input.harvestDate, 'Pick the expected harvest date.');

  const quantity = checkNumber(errors, 'quantity', input.quantityRaw, 'Quantity', {
    min: 0.001,
    max: MAX_LOT_KG,
  });
  if (quantity !== null && input.quantityKg > MAX_LOT_KG) {
    errors.quantity = `That converts to ${Math.round(input.quantityKg).toLocaleString()} kg, which is above the ${MAX_LOT_KG.toLocaleString()} kg limit for one listing.`;
  }

  const price = checkNumber(errors, 'price', input.priceRaw, 'Price', {
    min: 0.01,
    max: MAX_PRICE_PER_KG,
  });

  // --- Warnings: unusual, but the seller decides ----------------------------
  const crop = input.cropInfo;
  if (crop && price !== null) {
    const [low, high] = crop.typicalPricePerKg;
    if (price < low * 0.5) {
      warnings.push(
        `$${price.toFixed(2)}/kg is well below the typical ${crop.name.toLowerCase()} farm-gate range ($${low}–$${high}/kg).`,
      );
    } else if (price > high * 1.5) {
      warnings.push(
        `$${price.toFixed(2)}/kg is well above the typical ${crop.name.toLowerCase()} farm-gate range ($${low}–$${high}/kg).`,
      );
    }
  }
  if (crop && input.quantityKg > 0) {
    const [lotLow, lotHigh] = crop.typicalLotKg;
    if (input.quantityKg > lotHigh) {
      warnings.push(
        `${Math.round(input.quantityKg).toLocaleString()} kg is unusually large for a single ${crop.name.toLowerCase()} listing (typically up to ${lotHigh.toLocaleString()} kg).`,
      );
    } else if (input.quantityKg < lotLow) {
      warnings.push(
        `${Math.round(input.quantityKg).toLocaleString()} kg is a small lot for ${crop.name.toLowerCase()} (typically from ${lotLow.toLocaleString()} kg). Small lots are fine, pooling is what FarmPool is for.`,
      );
    }
  }
  if (input.quantityEstimated) {
    warnings.push(
      'Quantity was entered in containers, so the kg figure is an estimate. It will be confirmed at pickup.',
    );
  }
  if (crop && input.harvestDate) {
    const season = seasonWarning(crop, input.harvestDate, 'harvest date');
    if (season) warnings.push(season);
  }
  if (input.variety === OTHER_VARIETY && !isBlank(input.otherVariety)) {
    warnings.push(
      `"${input.otherVariety.trim()}" is not in our ${crop ? crop.name.toLowerCase() : 'crop'} catalog yet, so the listing will be flagged for review before buyers rely on the variety.`,
    );
  }
  const duplicate = (input.existingListings ?? []).find(
    (listing) =>
      listing.farmerName.trim().toLowerCase() === input.farmerName.trim().toLowerCase() &&
      listing.crop.trim().toLowerCase() === input.crop.trim().toLowerCase() &&
      listing.variety.trim().toLowerCase() ===
        (input.variety === OTHER_VARIETY ? input.otherVariety : input.variety)
          .trim()
          .toLowerCase() &&
      listing.harvestDate === input.harvestDate,
  );
  if (duplicate) {
    warnings.push(
      `${duplicate.farmerName} already has a ${duplicate.crop} listing for ${duplicate.harvestDate}. Submitting again creates a second separate lot, not an update.`,
    );
  }

  return { errors, warnings };
}

export function validateOrder(input: {
  businessName: string;
  crop: string;
  variety: string;
  otherVariety: string;
  quantityRaw: string;
  quantityKg: number;
  quantityEstimated: boolean;
  deliveryLocation: string;
  deliveryDate: string;
  maxPriceRaw: string;
  cropInfo?: CropInfo;
}): ValidationResult {
  const errors: FieldErrors = {};
  const warnings: string[] = [];

  requireField(errors, 'businessName', input.businessName, 'Business name is required.');
  requireField(errors, 'crop', input.crop, 'Pick the crop you need.');
  requireField(errors, 'variety', input.variety, 'Pick a variety (or "Other variety").');
  if (input.variety === OTHER_VARIETY && isBlank(input.otherVariety)) {
    errors.otherVariety = 'Type the variety you need.';
  }
  requireField(errors, 'deliveryLocation', input.deliveryLocation, 'Delivery location is required.');
  requireField(errors, 'deliveryDate', input.deliveryDate, 'Pick the required delivery date.');

  const quantity = checkNumber(errors, 'quantity', input.quantityRaw, 'Quantity', {
    min: 0.001,
    max: MAX_ORDER_KG,
  });
  if (quantity !== null && input.quantityKg > MAX_ORDER_KG) {
    errors.quantity = `That converts to ${Math.round(input.quantityKg).toLocaleString()} kg, which is above the ${MAX_ORDER_KG.toLocaleString()} kg order limit.`;
  }

  const maxPrice = checkNumber(errors, 'maxPrice', input.maxPriceRaw, 'Maximum delivered price', {
    min: 0.01,
    max: MAX_PRICE_PER_KG,
  });

  // --- Warnings -------------------------------------------------------------
  const crop = input.cropInfo;
  if (crop && maxPrice !== null) {
    const [low, high] = crop.typicalPricePerKg;
    if (maxPrice < low) {
      warnings.push(
        `A $${maxPrice.toFixed(2)}/kg delivered ceiling is below the typical ${crop.name.toLowerCase()} farm-gate range ($${low}–$${high}/kg) before transport, so few or no pools may fit.`,
      );
    } else if (maxPrice > high * 3) {
      warnings.push(
        `$${maxPrice.toFixed(2)}/kg delivered is far above the typical ${crop.name.toLowerCase()} range. Double-check the figure.`,
      );
    }
  }
  if (input.quantityEstimated) {
    warnings.push('Quantity was entered in containers, so the kg figure is an estimate.');
  }
  if (crop && input.deliveryDate) {
    const season = seasonWarning(crop, input.deliveryDate, 'delivery date');
    if (season) warnings.push(season);
  }
  if (input.variety === OTHER_VARIETY && !isBlank(input.otherVariety)) {
    warnings.push(
      `"${input.otherVariety.trim()}" is not in our catalog. Matching will use the exact name you typed.`,
    );
  }

  return { errors, warnings };
}
