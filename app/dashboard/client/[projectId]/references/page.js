import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import ReferencesPanel from '@/components/ReferencesPanel';

export default async function ClientReferencesPage({ params }) {
  const { projectId } = await params;
  const { supabase } = await getSessionProfile();

  const { data: project } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  const { data: references } = await supabase
    .from('project_references')
    .select('id, title, storage_path, source_url, colors, detected_text, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const withUrls = await Promise.all(
    (references || []).map(async (r) => {
      const { data } = await supabase.storage.from('project-files').createSignedUrl(r.storage_path, 3600);
      return { ...r, url: data?.signedUrl };
    })
  );

  return (
    <>
      <Link href={`/dashboard/client/${projectId}`} className="back-link">
        &larr; Back to {project.title}
      </Link>

      <div className="page-head">
        <div>
          <h1>References</h1>
          <p>Drop in inspiration — pull out its colors and text to reuse in your designs.</p>
        </div>
      </div>

      <div className="card">
        <ReferencesPanel projectId={projectId} references={withUrls} />
      </div>
    </>
  );
}
