import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import RetainerView from '@/components/RetainerView';

export default async function ClientRetainerDetail({ params, searchParams }) {
  const { projectId, retainerId } = await params;
  const { subscribed } = await searchParams;
  const { supabase } = await getSessionProfile();

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
      <Link href={`/dashboard/client/${projectId}/retainers`} className="back-link">
        &larr; Back to retainers
      </Link>

      <div className="page-head">
        <div>
          <h1>Retainer</h1>
        </div>
      </div>

      <RetainerView retainer={retainer} projectId={projectId} justSubscribed={subscribed === '1'} />
    </>
  );
}
