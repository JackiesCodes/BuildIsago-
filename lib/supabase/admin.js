import { createClient } from '@supabase/supabase-js';

// Server-only, and only ever for the Stripe webhook route. A webhook
// request carries no cookies/session, so it can't authenticate as any
// user — this bypasses Row Level Security entirely instead. Never import
// this from a Client Component, and never give SUPABASE_SECRET_KEY a
// NEXT_PUBLIC_ prefix.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
