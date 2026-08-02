import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import { hiddenProjectTabs } from '@/lib/engagement';
import RetainerList from '@/components/RetainerList';

export default async function ClientRetainersPage({ params }) {
  const { projectId } = await params;
  const { profile, supabase } = await getSessionProfile();

  // Hiding the tab is presentation; this is the actual gate. Uses the
  // same rule, so a self-serve client who does have records here is
  // still let through.
  const hide = await hiddenProjectTabs(supabase, { projectId, profile });
  if (hide.includes('retainers')) redirect(`/dashboard/client/${projectId}`);

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
