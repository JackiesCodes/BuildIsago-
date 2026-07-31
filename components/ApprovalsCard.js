import Link from 'next/link';

export default function ApprovalsCard({ approvalsHref, approvals }) {
  if (!approvals?.length) {
    return (
      <div>
        <p className="brand-card-meta">No approval requests yet</p>
        <Link href={approvalsHref} className="btn btn-ghost btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>
          Open Approvals
        </Link>
      </div>
    );
  }

  const pending = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div>
      <p className="brand-card-meta">
        {approvals.length} request{approvals.length === 1 ? '' : 's'}
        {pending ? ` · ${pending} awaiting a decision` : ' · all decided'}
      </p>
      <Link href={approvalsHref} className="btn btn-ghost btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>
        Open Approvals
      </Link>
    </div>
  );
}
