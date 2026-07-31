import Stripe from 'stripe';

let cached;

// Lazily constructed so the app doesn't crash at import/build time when
// STRIPE_SECRET_KEY isn't set yet — only invoice payment actions need it,
// matching how the Anthropic client degrades until ANTHROPIC_API_KEY is set.
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set.');
  }
  if (!cached) cached = new Stripe(process.env.STRIPE_SECRET_KEY);
  return cached;
}
