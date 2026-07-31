import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import ApprovalView from '@/components/ApprovalView';

export default async function ClientApprovalDetail({ params }) {
  const { projectId, approvalId } = await params;
  const { supabase } = await getSessionProfile();

  const { data: approval } = await supabase
    .from('project_approvals')
    .select('*')
    .eq('id', approvalId)
    .eq('project_id', projectId)
    .neq('status', 'draft')
    .single();

  if (!approval) notFound();

  let linkedDesign = null;
  if (approval.design_id) {
    const { data } = await supabase
      .from('project_designs')
      .select('id, title')
      .eq('id', approval.design_id)
      .maybeSingle();
    linkedDesign = data;
  }

  return (
    <>
      <Link href={`/dashboard/client/${projectId}/approvals`} className="back-link">
        &larr; Back to approvals
      </Link>

      <div className="page-head">
        <div>
          <h1>Approval Request</h1>
        </div>
      </div>

      <ApprovalView approval={approval} projectId={projectId} linkedDesign={linkedDesign} />
    </>
  );
}
