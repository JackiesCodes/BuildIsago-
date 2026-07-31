import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import RetainerList from '@/components/RetainerList';
import NewRetainerButton from '@/components/NewRetainerButton';

export default async function StudioRetainersPage({ params }) {
  const { projectId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: project } = await supabase.from('projects').select('id, title').eq('id', projectId).single();
  if (!project) notFound();

  const { data: retainers } = await supabase
    .from('project_retainers')
    .select('id, title, status, amount, currency, interval, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return (
    <>
      <Link href={`/dashboard/studio/${projectId}`} className="back-link">
        &larr; Back to {project.title}
      </Link>

      <div className="page-head">
        <div>
          <h1>Retainers</h1>
          <p>Recurring billing for ongoing work on this project.</p>
        </div>
        <NewRetainerButton projectId={projectId} />
      </div>

      <RetainerList retainers={retainers || []} basePath={`/dashboard/studio/${projectId}/retainers`} />
    </>
  );
}
