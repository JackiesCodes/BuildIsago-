import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';

/**
 * One guard covering every /dashboard/studio route.
 *
 * Until now the check was copy-pasted into all 20 studio pages plus the
 * project layout. That works right up until someone adds page 21 and
 * forgets — and the failure mode is silent, because the page renders
 * perfectly well for a client, just with studio chrome around whatever
 * RLS lets them see.
 *
 * This does NOT replace the per-page checks, and they were deliberately
 * left in place. Next.js renders a layout and its page in parallel, so a
 * redirect here does not stop the page's own server code from running —
 * and two studio pages write on render (ensureBrandKit, ensureDevScope).
 * Their guards are what stop a non-studio request reaching an insert.
 *
 * None of this is the real access control either way: RLS is. A missing
 * redirect costs a wrong-looking page, not leaked data.
 */
export default async function StudioLayout({ children }) {
  const { profile } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');
  return children;
}
