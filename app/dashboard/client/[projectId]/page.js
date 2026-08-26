import { redirect, notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import { serviceTool } from '@/lib/constants/services';

/**
 * A project has no overview any more — it opens the tool it is for.
 *
 * This used to be a page of messages, files, milestones and an AI draft:
 * the machinery of asking someone else to do the work. In a self-service
 * portal that is a lobby you have to walk through to reach the thing you
 * came for. The route stays so existing links and bookmarks resolve
 * instead of 404ing; it just forwards.
 */
export default async function ClientProjectDetail({ params }) {
  const { projectId } = await params;
  const { supabase } = await getSessionProfile();

  const { data: project } = await supabase
    .from('projects')
    .select('id, service_type')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  redirect(`/dashboard/client/${projectId}/${serviceTool(project.service_type)}`);
}
