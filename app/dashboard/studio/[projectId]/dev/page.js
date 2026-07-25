import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import { fetchRepoData } from '@/lib/github';
import DevScopeEditor from '@/components/DevScopeEditor';
import CreateDevScopeButton from '@/components/CreateDevScopeButton';
import RepoLinkForm from '@/components/RepoLinkForm';
import RepoPanel from '@/components/RepoPanel';

export default async function StudioDevStudioPage({ params }) {
  const { projectId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: project } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  const { data: devScope } = await supabase
    .from('project_dev_scopes')
    .select('id, project_id, features, tech_stack, phases, risks, repo_owner, repo_name, updated_at')
    .eq('project_id', projectId)
    .maybeSingle();

  const repoData =
    devScope?.repo_owner && devScope?.repo_name
      ? await fetchRepoData(devScope.repo_owner, devScope.repo_name)
      : null;

  return (
    <>
      <Link href={`/dashboard/studio/${projectId}`} className="back-link">
        &larr; Back to {project.title}
      </Link>

      <div className="page-head">
        <div>
          <h1>Dev Studio</h1>
          <p>Technical scope and a live view of the linked repository.</p>
        </div>
      </div>

      {devScope ? (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <DevScopeEditor devScope={devScope} />
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Repository</h3>
            <RepoLinkForm
              devScopeId={devScope.id}
              projectId={projectId}
              currentRepo={devScope.repo_owner && devScope.repo_name ? `${devScope.repo_owner}/${devScope.repo_name}` : ''}
            />
            <RepoPanel data={repoData} />
          </div>
        </>
      ) : (
        <div className="card" style={{ maxWidth: 480 }}>
          <CreateDevScopeButton projectId={projectId} />
        </div>
      )}
    </>
  );
}
