import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import ApprovalList from '@/components/ApprovalList';

export default async function ClientApprovalsPage({ params }) {
  const { projectId } = await params;
  const { supabase } = await getSessionProfile();

  const { data: project } = await supabase.from('projects').select('id, title').eq('id', projectId).single();
  if (!project) notFound();

  const { data: approvals } = await supabase
    .from('project_approvals')
    .select('id, title, status, created_at')
    .eq('project_id', projectId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  return (
    <>
      <Link href={`/dashboard/client/${projectId}`} className="back-link">
        &larr; Back to {project.title}
      </Link>

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
