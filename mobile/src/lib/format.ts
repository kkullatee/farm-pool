export const formatKg = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} t` : `${value} kg`;

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);

export const formatPrice = (value: number) => `$${value.toFixed(2)}/kg`;

export const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
