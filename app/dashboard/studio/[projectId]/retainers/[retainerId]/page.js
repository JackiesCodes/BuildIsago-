import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import RetainerEditor from '@/components/RetainerEditor';

export default async function StudioRetainerDetail({ params }) {
  const { projectId, retainerId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: retainer } = await supabase
    .from('project_retainers')
    .select('*')
    .eq('id', retainerId)
    .eq('project_id', projectId)
    .single();

  if (!retainer) notFound();

  return (
    <>
      <Link href={`/dashboard/studio/${projectId}/retainers`} className="back-link">
        &larr; Back to retainers
      </Link>

      <div className="page-head">
        <div>
          <h1>Retainer</h1>
        </div>
      </div>

      <RetainerEditor retainer={retainer} projectId={projectId} />
    </>
  );
}
