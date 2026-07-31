import Link from 'next/link';
import { ventureStageLabel } from '@/lib/constants/ventureStages';

const STATUS_LABELS = { new: 'New', reviewing: 'Reviewing', accepted: 'Accepted', declined: 'Declined' };
const STATUS_CLASSES = { new: 'invoice-status-draft', reviewing: 'invoice-status-sent', accepted: 'invoice-status-paid', declined: 'invoice-status-void' };

export default function MyVentureApplicationsList({ applications }) {
  if (!applications?.length) {
    return <p style={{ color: 'var(--muted-2)', fontSize: '0.88rem' }}>You haven&apos;t submitted a pitch yet.</p>;
  }

  return (
    <div className="project-list">
      {applications.map((a) => (
        <div key={a.id} className="project-row" style={{ cursor: 'default' }}>
          <div>
            <div className="title">{a.venture_name}</div>
            <div className="meta">
              <span>{new Date(a.created_at).toLocaleDateString()}</span>
              <span>· {ventureStageLabel(a.stage)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {a.promoted_venture_id && (
              <Link href={`/ventures`} className="field-hint" style={{ margin: 0 }}>
                On the portfolio
              </Link>
            )}
            <span className={`status-badge ${STATUS_CLASSES[a.status] || ''}`}>{STATUS_LABELS[a.status] || a.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
