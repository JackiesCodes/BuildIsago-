'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { notifyUser, notifyStudio } from '@/lib/notifications';
import { getOrigin } from '@/lib/utils/origin';

export async function sendMessage(projectId, prevState, formData) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect('/login');

  const body = formData.get('body')?.toString().trim();
  if (!body) return { error: 'Message cannot be empty.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('messages')
    .insert({ project_id: projectId, sender_id: user.id, body });

  if (error) return { error: error.message };

  const { data: project } = await supabase
    .from('projects')
    .select('client_id, title')
    .eq('id', projectId)
    .single();

  if (project) {
    const origin = await getOrigin();
    if (profile?.role === 'studio') {
      await notifyUser(project.client_id, {
        subject: `New message on ${project.title}`,
        text: `The studio sent a new message on "${project.title}":\n\n${body}\n\nView it: ${origin}/dashboard/client/${projectId}`,
      });
    } else {
      await notifyStudio({
        subject: `New message on ${project.title}`,
        text: `${profile?.full_name || 'A client'} sent a new message on "${project.title}":\n\n${body}\n\nView it: ${origin}/dashboard/studio/${projectId}`,
      });
    }
  }

  revalidatePath(`/dashboard/client/${projectId}`);
  revalidatePath(`/dashboard/studio/${projectId}`);
  return { error: null };
}

export async function recordUploadedFile(projectId, fileName, storagePath) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('project_files').insert({
    project_id: projectId,
    uploaded_by: user.id,
    file_name: fileName,
    storage_path: storagePath,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/client/${projectId}`);
  revalidatePath(`/dashboard/studio/${projectId}`);
  return { error: null };
}
