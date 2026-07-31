import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import ApprovalEditor from '@/components/ApprovalEditor';

export default async function StudioApprovalDetail({ params }) {
  const { projectId, approvalId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

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
      <Link href={`/dashboard/studio/${projectId}/approvals`} className="back-link">
        &larr; Back to approvals
      </Link>

      <div className="page-head">
        <div>
          <h1>Approval Request</h1>
        </div>
      </div>

      <ApprovalEditor approval={approval} projectId={projectId} designs={designs || []} />
    </>
  );
}
