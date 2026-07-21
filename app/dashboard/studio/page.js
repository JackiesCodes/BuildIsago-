import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import StatusSelect from '@/components/StatusSelect';

const COLUMNS = [
  { key: 'intake', label: 'Intake' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'completed', label: 'Completed' },
];

const SERVICE_LABELS = {
  software: 'Software Dev',
  branding: 'Branding',
  design: 'Graphic Design',
  multiple: 'Multiple',
};

export default async function StudioDashboard() {
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, service_type, status, created_at, profiles(full_name, company)')
    .order('created_at', { ascending: false });

  const all = projects || [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Studio Pipeline</h1>
          <p>Every client project, across all three disciplines, at a glance.</p>
        </div>
      </div>

      {!all.length ? (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>Client projects will show up here as soon as they&apos;re submitted.</p>
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
            <div className="stat-tile">
              <span className="stat-tile-num">{all.filter((p) => p.service_type === 'software').length}</span>
              <span className="stat-tile-label">Software Dev</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-num">{all.filter((p) => p.service_type === 'branding').length}</span>
              <span className="stat-tile-label">Branding</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-num">{all.filter((p) => p.service_type === 'design').length}</span>
              <span className="stat-tile-label">Graphic Design</span>
            </div>
          </div>

          <div className="kanban-board">
            {COLUMNS.map((col) => {
              const items = all.filter((p) => p.status === col.key);
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
                          <span className="service-tag">{SERVICE_LABELS[p.service_type] || p.service_type}</span>
                        </Link>
                        <StatusSelect projectId={p.id} status={p.status} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
