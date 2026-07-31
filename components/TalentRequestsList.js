'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateTalentRequestStatus } from '@/lib/actions/marketplace';

const STATUS_LABELS = { new: 'New', contacted: 'Contacted', closed: 'Closed' };

export default function TalentRequestsList({ requests }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleStatusChange(requestId, status) {
    startTransition(async () => {
      await updateTalentRequestStatus(requestId, status);
      router.refresh();
    });
  }

  if (!requests?.length) {
    return <p style={{ color: 'var(--muted-2)', fontSize: '0.88rem' }}>No inquiries yet.</p>;
  }

  return (
    <div className="devscope-list">
      {requests.map((r) => (
        <div key={r.id} className="approval-decision" style={{ marginBottom: 10 }}>
          <span className="approval-decision-label">
            {STATUS_LABELS[r.status] || r.status} · {new Date(r.created_at).toLocaleString()}
          </span>
          <p className="approval-feedback">{r.message}</p>
          <select
            value={r.status}
            onChange={(e) => handleStatusChange(r.id, e.target.value)}
            disabled={pending}
            style={{ marginTop: 10 }}
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      ))}
    </div>
  );
}
