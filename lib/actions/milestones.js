'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';

export async function toggleMilestone(milestoneId, projectId, completed) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase
    .from('project_milestones')
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq('id', milestoneId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/studio/${projectId}`);
  revalidatePath(`/dashboard/client/${projectId}`);
  return { error: null };
}
