import Link from 'next/link';
import { getSessionProfile } from '@/lib/supabase/server';
import StatusBadge from '@/components/StatusBadge';

export default async function ClientDashboard() {
  const { user, supabase } = await getSessionProfile();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, service_type, status, created_at')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Your projects</h1>
          <p>Track progress, share files, and message the studio.</p>
        </div>
        <Link href="/dashboard/client/new" className="btn btn-primary" style={{ width: 'auto' }}>
          New Project
        </Link>
      </div>

      {!projects?.length ? (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>Start your first project and we&apos;ll take it from there.</p>
        </div>
      ) : (
        <div className="project-list">
          {projects.map((p) => (
            <Link key={p.id} href={`/dashboard/client/${p.id}`} className="project-row">
              <div>
                <div className="title">{p.title}</div>
                <div className="meta">
                  <span className="service-tag">{p.service_type.replace('_', ' ')}</span>
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
