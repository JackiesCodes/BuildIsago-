import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import { hiddenProjectTabs } from '@/lib/engagement';
import ApprovalList from '@/components/ApprovalList';

export default async function ClientApprovalsPage({ params }) {
  const { projectId } = await params;
  const { profile, supabase } = await getSessionProfile();

  // Hiding the tab is presentation; this is the actual gate. Uses the
  // same rule, so a self-serve client who does have records here is
  // still let through.
  const hide = await hiddenProjectTabs(supabase, { projectId, profile });
  if (hide.includes('approvals')) redirect(`/dashboard/client/${projectId}`);

  const { data: approvals } = await supabase
    .from('project_approvals')
    .select('id, title, status, created_at')
    .eq('project_id', projectId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Approvals</h1>
          <p>Review and decide on anything the studio has sent for sign-off.</p>
        </div>
      </div>

      <ApprovalList approvals={approvals || []} basePath={`/dashboard/client/${projectId}/approvals`} />
    </>
  );
}
