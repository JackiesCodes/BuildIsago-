import Link from 'next/link';
import { getSessionProfile } from '@/lib/supabase/server';
import StatusBadge from '@/components/StatusBadge';
import ProjectSearch from '@/components/ProjectSearch';
import { serviceLabel } from '@/lib/constants/services';

/**
 * The Projects section. This used to be the dashboard home doing double
 * duty — hero and composer when idle, a result list when ?q= was set —
 * which meant the home page changed identity depending on a query
 * string. The list lives here now and the home page is just the home
 * page.
 *
 * Static segment, so it takes precedence over /dashboard/client/[projectId].
 */
export default async function ProjectsPage({ searchParams }) {
  const { q } = await searchParams;
  const { user, supabase } = await getSessionProfile();

  let query = supabase
    .from('projects')
    .select('id, title, service_type, status, created_at')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false });

  // RLS already scopes this to the signed-in client; the explicit
  // client_id keeps the query honest if a policy is ever widened.
  if (q) query = query.ilike('title', `%${q}%`);

  const { data: projects } = await query;
  const searching = Boolean(q);

  return (
    <>
      <div className="page-head page-head-search">
        <div>
          <h1>Projects</h1>
          <p>
            {searching
              ? `${projects?.length || 0} matching “${q}”`
              : `${projects?.length || 0} in total`}
          </p>
        </div>
        <ProjectSearch />
      </div>

      {!projects?.length ? (
        <div className="empty-state">
          <h3>{searching ? 'No matching projects' : 'No projects yet'}</h3>
          <p>
            {searching
              ? 'Try a different search term.'
              : 'Start one from the home page and it will show up here.'}
          </p>
          {!searching && (
            <Link href="/dashboard/client" className="btn btn-primary">
              Go to home
            </Link>
          )}
        </div>
      ) : (
        <div className="project-list">
          {projects.map((p) => (
            <Link key={p.id} href={`/dashboard/client/${p.id}`} className="project-row">
              <div>
                <div className="title">{p.title}</div>
                <div className="meta">
                  <span className="service-tag">{serviceLabel(p.service_type)}</span>
                  <span>·</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <StatusBadge status={p.status} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
