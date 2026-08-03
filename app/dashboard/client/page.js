import Link from 'next/link';
import { getSessionProfile } from '@/lib/supabase/server';
import StatusBadge from '@/components/StatusBadge';
import QuickStartCard from '@/components/QuickStartCard';
import DashboardHero from '@/components/DashboardHero';
import { SERVICES, serviceLabel } from '@/lib/constants/services';
import { isSelfServe } from '@/lib/engagement';

export default async function ClientDashboard({ searchParams }) {
  const { q } = await searchParams;
  const { user, profile, supabase } = await getSessionProfile();

  // Only queried when searching. The landing view lists nothing — the
  // projects live in the sidebar/drawer now, and repeating them here was
  // the same list twice on one screen.
  const searching = Boolean(q);
  let projects = null;
  if (searching) {
    const { data } = await supabase
      .from('projects')
      .select('id, title, service_type, status, created_at')
      .eq('client_id', user.id)
      .ilike('title', `%${q}%`)
      .order('created_at', { ascending: false });
    projects = data;
  }

  const firstName = (profile?.full_name || user.email || '').split(/[\s@]/)[0];
  const selfServe = isSelfServe(profile);

  // The top bar searches by navigating here with ?q=, so this page still
  // has to render results even though it no longer lists projects.
  if (searching) {
    return (
      <>
        <div className="page-head">
          <div>
            <h2>Results for &ldquo;{q}&rdquo;</h2>
            <p>{projects?.length ? `${projects.length} matching` : 'No matches'}</p>
          </div>
        </div>

        {!projects?.length ? (
          <div className="empty-state">
            <h3>No matching projects</h3>
            <p>Try a different search term.</p>
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

  return (
    <>
      <DashboardHero firstName={firstName} selfServe={selfServe} />

      <div className="quick-start-grid">
        {SERVICES.map(({ value, label, description }) => (
          <QuickStartCard
            key={value}
            value={value}
            label={label}
            description={description}
            selfServe={selfServe}
          />
        ))}
      </div>

    </>
  );
}
