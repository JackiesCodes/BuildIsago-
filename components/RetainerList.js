import Link from 'next/link';
import RetainerStatusBadge from './RetainerStatusBadge';
import { formatMoney } from '@/lib/utils/money';

export default function RetainerList({ retainers, basePath }) {
  if (!retainers?.length) {
    return (
      <div className="empty-state">
        <h3>No retainers yet</h3>
        <p>Recurring billing set up on this project will show up here.</p>
      </div>
    );
  }

  return (
    <div className="project-list">
      {retainers.map((r) => (
        <Link key={r.id} href={`${basePath}/${r.id}`} className="project-row">
          <div>
            <div className="title">{r.title}</div>
            <div className="meta">
              <span>{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(r.amount, r.currency)}/{r.interval}
            </span>
            <RetainerStatusBadge status={r.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
