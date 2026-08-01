import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import ApprovalList from '@/components/ApprovalList';
import NewApprovalButton from '@/components/NewApprovalButton';

export default async function StudioApprovalsPage({ params }) {
  const { projectId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: approvals } = await supabase
    .from('project_approvals')
    .select('id, title, status, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Approvals</h1>
          <p>Ask the client to sign off on a direction, brief, or design.</p>
        </div>
        <NewApprovalButton projectId={projectId} />
      </div>

      <ApprovalList approvals={approvals || []} basePath={`/dashboard/studio/${projectId}/approvals`} />
    </>
  );
}
