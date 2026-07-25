'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { DESIGN_FORMAT_MAP, DESIGN_FORMATS } from '@/lib/constants/designFormats';

export async function createDesign(projectId, formatValue) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const format = DESIGN_FORMAT_MAP[formatValue] || DESIGN_FORMATS[0];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_designs')
    .insert({
      project_id: projectId,
      created_by: user.id,
      title: format.label,
      format: format.value,
      width: format.width,
      height: format.height,
      canvas_json: {},
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/client/${projectId}`);
  revalidatePath(`/dashboard/studio/${projectId}`);
  redirect(`/design/${projectId}/${data.id}`);
}

export async function updateDesignCanvas(designId, projectId, canvasJson, title) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const payload = { canvas_json: canvasJson };
  if (title !== undefined) payload.title = title?.trim() || 'Untitled design';

  const { error } = await supabase.from('project_designs').update(payload).eq('id', designId);
  if (error) return { error: error.message };

  revalidatePath(`/design/${projectId}/${designId}`);
  return { error: null };
}

export async function deleteDesign(designId, projectId) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('project_designs').delete().eq('id', designId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/client/${projectId}`);
  revalidatePath(`/dashboard/studio/${projectId}`);
  return { error: null };
}
