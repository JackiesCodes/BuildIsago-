import Link from 'next/link';
import VentureStatusBadge from './VentureStatusBadge';
import { ventureStageLabel } from '@/lib/constants/ventureStages';

export default function VentureAdminList({ ventures }) {
  if (!ventures?.length) {
    return (
      <div className="empty-state">
        <h3>No ventures yet</h3>
        <p>Startups BuildIsago is incubating or has invested in will show up here.</p>
      </div>
    );
  }

  return (
    <div className="project-list">
      {ventures.map((v) => (
        <Link key={v.id} href={`/dashboard/studio/ventures/${v.id}`} className="project-row">
          <div>
            <div className="title">{v.name}</div>
            <div className="meta">
              <span>{new Date(v.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="service-tag">{ventureStageLabel(v.stage)}</span>
            <VentureStatusBadge status={v.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
