'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { SERVICE_MAP } from '@/lib/constants/services';

export async function createProject(prevState, formData) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const title = formData.get('title')?.toString().trim();
  const serviceType = formData.get('service_type')?.toString();
  const description = formData.get('description')?.toString().trim();
  const dueDate = formData.get('due_date')?.toString();

  if (!title || !serviceType || !description) {
    return { error: 'Please fill in every field.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      client_id: user.id,
      title,
      service_type: serviceType,
      description,
      due_date: dueDate || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  const template = SERVICE_MAP[serviceType]?.milestones || SERVICE_MAP.multiple.milestones;
  const milestones = template.map((stageTitle, position) => ({
    project_id: data.id,
    title: stageTitle,
    position,
  }));
  const { error: milestonesError } = await supabase.from('project_milestones').insert(milestones);

  revalidatePath('/dashboard/client');
  if (milestonesError) {
    console.error('Failed to seed milestones for project', data.id, milestonesError);
    redirect(`/dashboard/client/${data.id}?setup=partial`);
  }
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

export async function updateProjectMeta(projectId, { due_date, priority }) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase
    .from('projects')
    .update({ due_date: due_date || null, priority })
    .eq('id', projectId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/studio/${projectId}`);
  revalidatePath('/dashboard/studio');
  return { error: null };
}
