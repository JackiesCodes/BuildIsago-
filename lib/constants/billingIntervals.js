export const BILLING_INTERVALS = [
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];

export const BILLING_INTERVAL_MAP = Object.fromEntries(BILLING_INTERVALS.map((i) => [i.value, i]));

export function billingIntervalLabel(value) {
  return BILLING_INTERVAL_MAP[value]?.label || value;
}
