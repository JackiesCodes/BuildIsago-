import { getSessionProfile } from '@/lib/supabase/server';
import { fetchRepoData } from '@/lib/github';
import DevScopeEditor from '@/components/DevScopeEditor';
import { ensureDevScope } from '@/lib/studioProvision';
import { logError } from '@/lib/logging';
import RepoLinkForm from '@/components/RepoLinkForm';
import RepoPanel from '@/components/RepoPanel';

export default async function ClientDevStudioPage({ params }) {
  const { projectId } = await params;
  const { user, supabase } = await getSessionProfile();

  const { data: devScope, error } = await ensureDevScope(supabase, projectId, user.id);
  if (error) await logError('dev.ensureDevScope', error, { projectId });

  const repoData =
    devScope?.repo_owner && devScope?.repo_name
      ? await fetchRepoData(devScope.repo_owner, devScope.repo_name)
      : null;

  return (
    <>
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
        <div className="empty-state">
          <h3>Couldn&apos;t open the Dev Studio</h3>
          <p>We couldn&apos;t set up this dev scope — please try again shortly.</p>
        </div>
      )}
    </>
  );
}
