export const formatKg = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} t` : `${value} kg`;

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);

/** Cents-precision money for itemised breakdowns, so displayed lines sum to the
 * displayed total exactly (whole-dollar rounding made them look $1 off). */
export const formatMoneyExact = (value: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const formatPrice = (value: number) => `$${value.toFixed(2)}/kg`;

/** Deterministic lot code so each farm's produce stays traceable in a pool. */
export const lotCode = (harvestId: string, stop: number) => {
  const tail = harvestId.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase();
  return `LOT-${stop}-${tail}`;
};

export const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
