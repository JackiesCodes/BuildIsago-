'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { logAudit, logError } from '@/lib/logging';

const MODES = ['self_serve', 'managed'];

export async function setEngagementMode(mode) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');
  if (!MODES.includes(mode)) return { error: 'Unknown working mode.' };

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ engagement_mode: mode }).eq('id', user.id);

  if (error) {
    await logError('engagement.setEngagementMode', error, { mode });
    return { error: error.message };
  }

  await logAudit(supabase, 'engagement_mode.changed', 'profile', user.id, { mode });

  // Changes which tabs render on every project page for this account.
  revalidatePath('/dashboard', 'layout');
  return { error: null };
}
