import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import ApprovalView from '@/components/ApprovalView';
import Breadcrumbs from '@/components/Breadcrumbs';

export default async function ClientApprovalDetail({ params }) {
  const { projectId, approvalId } = await params;
  const { supabase } = await getSessionProfile();

  const { data: project } = await supabase.from('projects').select('id, title').eq('id', projectId).maybeSingle();

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
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/dashboard/client' },
          { label: project?.title || 'Project', href: `/dashboard/client/${projectId}` },
          { label: 'Approvals', href: `/dashboard/client/${projectId}/approvals` },
          { label: 'Approval Request' },
        ]}
      />

      <div className="page-head">
        <div>
          <h1>Approval Request</h1>
        </div>
      </div>

      <ApprovalView approval={approval} projectId={projectId} linkedDesign={linkedDesign} />
    </>
  );
}
