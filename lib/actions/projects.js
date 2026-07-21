'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';

export const MILESTONE_TEMPLATES = {
  software: ['Requirements', 'Design', 'Build', 'QA', 'Launch'],
  branding: ['Discovery', 'Concepts', 'Revisions', 'Final Delivery'],
  design: ['Brief', 'Drafts', 'Feedback', 'Delivery'],
  multiple: ['Discovery', 'In Progress', 'Review', 'Delivery'],
};

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

  const template = MILESTONE_TEMPLATES[serviceType] || MILESTONE_TEMPLATES.multiple;
  const milestones = template.map((title, position) => ({
    project_id: data.id,
    title,
    position,
  }));
  await supabase.from('project_milestones').insert(milestones);

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
