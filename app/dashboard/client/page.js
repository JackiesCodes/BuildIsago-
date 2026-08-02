import Link from 'next/link';
import { getSessionProfile } from '@/lib/supabase/server';
import StatusBadge from '@/components/StatusBadge';
import QuickStartCard from '@/components/QuickStartCard';
import { SERVICES, serviceLabel } from '@/lib/constants/services';

export default async function ClientDashboard({ searchParams }) {
  const { q } = await searchParams;
  const { user, profile, supabase } = await getSessionProfile();

  let query = supabase
    .from('projects')
    .select('id, title, service_type, status, created_at')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false });

  if (q) query = query.ilike('title', `%${q}%`);

  const { data: projects } = await query;
  const firstName = (profile?.full_name || user.email || '').split(/[\s@]/)[0];

  return (
    <>
      <div className="greeting">
        <h1>Hello, {firstName}</h1>
        <p>What are we building today?</p>
      </div>

      {!q && (
        <div className="quick-start-grid">
          {SERVICES.map(({ value, label, description }) => (
            <QuickStartCard
              key={value}
              value={value}
              label={label}
              description={description}
              selfServe={profile?.engagement_mode === 'self_serve'}
            />
          ))}
        </div>
      )}

      <div className="page-head" style={{ marginTop: q ? 0 : 40 }}>
        <div>
          <h2>{q ? `Results for "${q}"` : 'Your projects'}</h2>
          <p>Track progress, share files, and message the studio.</p>
        </div>
        <Link href="/dashboard/client/new" className="btn btn-primary" style={{ width: 'auto' }}>
          New Project
        </Link>
      </div>

      {!projects?.length ? (
        <div className="empty-state">
          <h3>{q ? 'No matching projects' : 'No projects yet'}</h3>
          <p>{q ? 'Try a different search term.' : "Start your first project and we'll take it from there."}</p>
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
