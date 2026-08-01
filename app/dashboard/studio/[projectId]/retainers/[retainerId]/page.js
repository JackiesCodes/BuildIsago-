import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import RetainerEditor from '@/components/RetainerEditor';
import Breadcrumbs from '@/components/Breadcrumbs';

export default async function StudioRetainerDetail({ params }) {
  const { projectId, retainerId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: project } = await supabase.from('projects').select('id, title').eq('id', projectId).maybeSingle();

  const { data: retainer } = await supabase
    .from('project_retainers')
    .select('*')
    .eq('id', retainerId)
    .eq('project_id', projectId)
    .single();

  if (!retainer) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Pipeline', href: '/dashboard/studio' },
          { label: project?.title || 'Project', href: `/dashboard/studio/${projectId}` },
          { label: 'Retainers', href: `/dashboard/studio/${projectId}/retainers` },
          { label: 'Retainer' },
        ]}
      />

      <div className="page-head">
        <div>
          <h1>Retainer</h1>
        </div>
      </div>

      <RetainerEditor retainer={retainer} projectId={projectId} />
    </>
  );
}
