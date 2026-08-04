import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import StatusSelect from '@/components/StatusSelect';
import PriorityBadge from '@/components/PriorityBadge';
import DueDate from '@/components/DueDate';
import KanbanSwipeDots from '@/components/KanbanSwipeDots';
import ProjectSearch from '@/components/ProjectSearch';
import { SERVICES, serviceLabel } from '@/lib/constants/services';

const COLUMNS = [
  { key: 'intake', label: 'Intake' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'completed', label: 'Completed' },
];

const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };

function byUrgency(a, b) {
  const rank = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
  if (rank !== 0) return rank;
  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
  if (a.due_date) return -1;
  if (b.due_date) return 1;
  return 0;
}

export default async function StudioDashboard({ searchParams }) {
  const { q } = await searchParams;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  // The pipeline is the studio's work board, so it lists work the studio
  // was actually given. A self-serve account's projects are that
  // person's own workspace — nobody asked the studio for anything, and
  // before this filter they queued up in Intake looking like unstarted
  // jobs. Switching an account to "BuildIsago works with me" is what
  // hands its projects over, and they appear here from that moment.
  // !inner so the filter applies to the join rather than nulling it.
  let query = supabase
    .from('projects')
    .select('id, title, service_type, status, created_at, due_date, priority, profiles!inner(full_name, company, engagement_mode)')
    .eq('profiles.engagement_mode', 'managed')
    .order('created_at', { ascending: false });

  if (q) query = query.ilike('title', `%${q}%`);

  const { data: projects } = await query;
  const all = projects || [];
  const firstName = (profile?.full_name || '').split(/\s/)[0] || 'there';

  return (
    <>
      {/* One heading, not two. This was a "Hello, Albin" block stacked on
          top of a "Studio Pipeline" block — an h1 and an h2 introducing
          the same page, costing ~130px before any work was visible. The
          greeting survives as the supporting line, where it still reads
          as a greeting without pretending to be a second page title. */}
      <div className="page-head page-head-search">
        <div>
          <h1>{q ? `Results for “${q}”` : 'Studio Pipeline'}</h1>
          <p>
            Hello, {firstName} — every project clients have handed to the studio, at a glance.
          </p>
        </div>
        {/* The pipeline is the studio's projects section, so its search
            sits here for the same reason the client's sits on theirs. */}
        <ProjectSearch placeholder="Search the pipeline…" />
      </div>

      {!all.length ? (
        <div className="empty-state">
          <h3>{q ? 'No matching projects' : 'No projects yet'}</h3>
          <p>{q ? 'Try a different search term.' : "Projects appear here once a client asks the studio to work on them."}</p>
        </div>
      ) : (
        <>
          <div className="stats-row">
            <div className="stat-tile">
              <span className="stat-tile-num">{all.length}</span>
              <span className="stat-tile-label">Total Projects</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-num">{all.filter((p) => p.status !== 'completed').length}</span>
              <span className="stat-tile-label">Active</span>
            </div>
            {SERVICES.map(({ value, shortLabel }) => (
              <div className="stat-tile" key={value}>
                <span className="stat-tile-num">{all.filter((p) => p.service_type === value).length}</span>
                <span className="stat-tile-label">{shortLabel}</span>
              </div>
            ))}
          </div>

          <div className="kanban-board" id="kanban-board">
            {COLUMNS.map((col) => {
              const items = all.filter((p) => p.status === col.key).sort(byUrgency);
              return (
                <div className="kanban-column" key={col.key}>
                  <div className="kanban-column-head">
                    <span>{col.label}</span>
                    <span className="kanban-count">{items.length}</span>
                  </div>
                  <div className="kanban-cards">
                    {!items.length && <p className="kanban-empty">Nothing here</p>}
                    {items.map((p) => (
                      <div className="kanban-card" key={p.id}>
                        <Link href={`/dashboard/studio/${p.id}`} className="kanban-card-link">
                          <span className="kanban-card-title">{p.title}</span>
                          <span className="kanban-card-client">
                            {p.profiles?.full_name || 'Unknown client'}
                            {p.profiles?.company ? ` · ${p.profiles.company}` : ''}
                          </span>
                          <div className="kanban-card-tags">
                            <span className="service-tag">{serviceLabel(p.service_type)}</span>
                            <PriorityBadge priority={p.priority} />
                            <DueDate date={p.due_date} />
                          </div>
                        </Link>
                        <StatusSelect projectId={p.id} status={p.status} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <KanbanSwipeDots boardId="kanban-board" columns={COLUMNS} />
        </>
      )}
    </>
  );
}
