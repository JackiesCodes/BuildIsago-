import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import RetainerView from '@/components/RetainerView';
import Breadcrumbs from '@/components/Breadcrumbs';

export default async function ClientRetainerDetail({ params, searchParams }) {
  const { projectId, retainerId } = await params;
  const { subscribed } = await searchParams;
  const { supabase } = await getSessionProfile();

  const { data: project } = await supabase.from('projects').select('id, title').eq('id', projectId).maybeSingle();

  const { data: retainer } = await supabase
    .from('project_retainers')
    .select('*')
    .eq('id', retainerId)
    .eq('project_id', projectId)
    .neq('status', 'draft')
    .single();

  if (!retainer) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/dashboard/client' },
          { label: project?.title || 'Project', href: `/dashboard/client/${projectId}` },
          { label: 'Retainers', href: `/dashboard/client/${projectId}/retainers` },
          { label: 'Retainer' },
        ]}
      />

      <div className="page-head">
        <div>
          <h1>Retainer</h1>
        </div>
      </div>

      <RetainerView retainer={retainer} projectId={projectId} justSubscribed={subscribed === '1'} />
    </>
  );
}
