import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import StatusBadge from '@/components/StatusBadge';

export default async function StudioDashboard() {
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, service_type, status, created_at, profiles(full_name, company)')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>All projects</h1>
          <p>Every client project across the studio.</p>
        </div>
      </div>

      {!projects?.length ? (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>Client projects will show up here as soon as they&apos;re submitted.</p>
        </div>
      ) : (
        <div className="project-list">
          {projects.map((p) => (
            <Link key={p.id} href={`/dashboard/studio/${p.id}`} className="project-row">
              <div>
                <div className="title">{p.title}</div>
                <div className="meta">
                  <span>{p.profiles?.full_name || 'Unknown client'}</span>
                  {p.profiles?.company && <span>· {p.profiles.company}</span>}
                  <span>·</span>
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
