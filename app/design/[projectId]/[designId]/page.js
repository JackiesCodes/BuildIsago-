import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import DesignEditor from '@/components/DesignEditor';

export default async function DesignEditorPage({ params }) {
  const { projectId, designId } = await params;
  const { user, profile, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  const { data: design } = await supabase
    .from('project_designs')
    .select('id, project_id, title, format, width, height, canvas_json, updated_at')
    .eq('id', designId)
    .eq('project_id', projectId)
    .single();

  if (!design) notFound();

  const { data: references } = await supabase
    .from('project_references')
    .select('id, title, storage_path')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const referencesWithUrls = await Promise.all(
    (references || []).map(async (r) => {
      const { data } = await supabase.storage.from('project-files').createSignedUrl(r.storage_path, 3600);
      return { id: r.id, title: r.title, url: data?.signedUrl };
    })
  );

  const backHref = profile?.role === 'studio' ? `/dashboard/studio/${projectId}` : `/dashboard/client/${projectId}`;

  return <DesignEditor design={design} backHref={backHref} references={referencesWithUrls.filter((r) => r.url)} />;
}
