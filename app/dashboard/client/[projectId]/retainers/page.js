import { getSessionProfile } from '@/lib/supabase/server';
import RetainerList from '@/components/RetainerList';

export default async function ClientRetainersPage({ params }) {
  const { projectId } = await params;
  const { supabase } = await getSessionProfile();

  const { data: retainers } = await supabase
    .from('project_retainers')
    .select('id, title, status, amount, currency, interval, created_at')
    .eq('project_id', projectId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Retainers</h1>
          <p>Ongoing recurring billing for this project.</p>
        </div>
      </div>

      <RetainerList retainers={retainers || []} basePath={`/dashboard/client/${projectId}/retainers`} />
    </>
  );
}
