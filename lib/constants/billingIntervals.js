export const BILLING_INTERVALS = [
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];

export function billingIntervalLabel(value) {
  return value === 'year' ? 'year' : 'month';
}
