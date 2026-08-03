'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { SERVICE_MAP } from '@/lib/constants/services';
import { notifyStudio } from '@/lib/notifications';
import { getOrigin } from '@/lib/utils/origin';
import { logAudit, logError } from '@/lib/logging';

export async function createProject(prevState, formData) {
  const { user, profile } = await getSessionProfile();
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

  const origin = await getOrigin();
  await notifyStudio({
    subject: `New project: ${title}`,
    text: `${profile?.full_name || user.email} started a new project: "${title}".\n\n${description}\n\nView it: ${origin}/dashboard/studio/${data.id}`,
  });

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

export async function renameProject(projectId, title) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  // rename_project writes only the title. A plain UPDATE would need a
  // client-facing UPDATE policy on projects, which would also expose
  // status, due_date, priority and client_id.
  const { error } = await supabase.rpc('rename_project', {
    p_project_id: projectId,
    p_title: title,
  });
  if (error) {
    await logError('projects.renameProject', error, { projectId });
    return { error: error.message };
  }

  await logAudit(supabase, 'project.renamed', 'project', projectId, { title });
  revalidatePath('/dashboard', 'layout');
  return { error: null };
}

/**
 * Removes every stored file for a project. Storage is not covered by the
 * database cascade, so without this the blobs stay in the bucket with
 * nothing left pointing at them — and Supabase blocks deleting them in
 * SQL afterwards, so it has to happen here, before the row goes.
 */
async function removeProjectStorage(supabase, projectId) {
  // list() is not recursive, so the references subfolder is walked too.
  const folders = [projectId, `${projectId}/references`];
  const paths = [];

  for (const folder of folders) {
    const { data, error } = await supabase.storage.from('project-files').list(folder, { limit: 1000 });
    if (error) {
      await logError('projects.removeProjectStorage.list', error, { projectId, folder });
      continue;
    }
    for (const entry of data || []) {
      // Directory placeholders come back with no id; only real objects
      // can be removed.
      if (entry.id) paths.push(`${folder}/${entry.name}`);
    }
  }

  if (!paths.length) return;
  const { error } = await supabase.storage.from('project-files').remove(paths);
  if (error) await logError('projects.removeProjectStorage.remove', error, { projectId, count: paths.length });
}

export async function deleteProject(projectId) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();

  // Storage first: once the row is gone the paths are unrecoverable, and
  // the delete itself may still be refused (e.g. live invoices), in
  // which case nothing has been lost — the files are re-derivable from
  // the rows that still exist.
  await removeProjectStorage(supabase, projectId);

  const { error } = await supabase.rpc('delete_project', { p_project_id: projectId });
  if (error) {
    await logError('projects.deleteProject', error, { projectId });
    return { error: error.message };
  }

  await logAudit(supabase, 'project.deleted', 'project', projectId, null);
  revalidatePath('/dashboard', 'layout');
  redirect(profile?.role === 'studio' ? '/dashboard/studio' : '/dashboard/client');
}
