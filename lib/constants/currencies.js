// Kept to currencies that are unambiguously supported by Stripe Checkout
// regardless of account country. Extend this list to match the studio's
// actual Stripe account if needed.
export const CURRENCIES = [
  { value: 'usd', label: 'USD — US Dollar' },
  { value: 'eur', label: 'EUR — Euro' },
  { value: 'gbp', label: 'GBP — British Pound' },
  { value: 'zar', label: 'ZAR — South African Rand' },
];
