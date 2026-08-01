import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import ApprovalEditor from '@/components/ApprovalEditor';
import Breadcrumbs from '@/components/Breadcrumbs';

export default async function StudioApprovalDetail({ params }) {
  const { projectId, approvalId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: project } = await supabase.from('projects').select('id, title').eq('id', projectId).maybeSingle();

  const { data: approval } = await supabase
    .from('project_approvals')
    .select('*')
    .eq('id', approvalId)
    .eq('project_id', projectId)
    .single();

  if (!approval) notFound();

  const { data: designs } = await supabase
    .from('project_designs')
    .select('id, title')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Pipeline', href: '/dashboard/studio' },
          { label: project?.title || 'Project', href: `/dashboard/studio/${projectId}` },
          { label: 'Approvals', href: `/dashboard/studio/${projectId}/approvals` },
          { label: 'Approval Request' },
        ]}
      />

      <div className="page-head">
        <div>
          <h1>Approval Request</h1>
        </div>
      </div>

      <ApprovalEditor approval={approval} projectId={projectId} designs={designs || []} />
    </>
  );
}
