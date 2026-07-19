'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';

export async function createProject(prevState, formData) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const title = formData.get('title')?.toString().trim();
  const serviceType = formData.get('service_type')?.toString();
  const description = formData.get('description')?.toString().trim();

  if (!title || !serviceType || !description) {
    return { error: 'Please fill in every field.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({ client_id: user.id, title, service_type: serviceType, description })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/client');
  redirect(`/dashboard/client/${data.id}`);
}

export async function updateProjectStatus(projectId, status) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('projects').update({ status }).eq('id', projectId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/studio/${projectId}`);
  revalidatePath('/dashboard/studio');
  return { error: null };
}
