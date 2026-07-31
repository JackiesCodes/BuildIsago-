import Link from 'next/link';
import { formatMoney } from '@/lib/utils/money';

export default function RetainersCard({ retainersHref, retainers }) {
  if (!retainers?.length) {
    return (
      <div>
        <p className="brand-card-meta">No retainers yet</p>
        <Link href={retainersHref} className="btn btn-ghost btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>
          Open Retainers
        </Link>
      </div>
    );
  }

  const active = retainers.filter((r) => r.status === 'active');
  const activeSummary =
    active.length === 1
      ? `${formatMoney(active[0].amount, active[0].currency)}/${active[0].interval} active`
      : active.length
        ? `${active.length} active`
        : 'none active';

  return (
    <div>
      <p className="brand-card-meta">
        {retainers.length} retainer{retainers.length === 1 ? '' : 's'} · {activeSummary}
      </p>
      <Link href={retainersHref} className="btn btn-ghost btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>
        Open Retainers
      </Link>
    </div>
  );
}
