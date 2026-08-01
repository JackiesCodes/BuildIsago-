'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { refundEnrollment } from '@/lib/actions/academy';
import { formatMoney } from '@/lib/utils/money';

const STATUS_LABELS = { paid: 'Enrolled', refunded: 'Refunded' };

export default function CourseEnrollmentsList({ enrollments, isOwner }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRefund(enrollmentId) {
    if (!confirm('Refund this enrollment through Stripe? This cannot be undone.')) return;
    startTransition(async () => {
      const result = await refundEnrollment(enrollmentId);
      if (result?.error) alert(result.error);
      else router.refresh();
    });
  }

  if (!enrollments?.length) {
    return <p style={{ color: 'var(--muted-2)', fontSize: '0.88rem' }}>No enrollments yet.</p>;
  }

  return (
    <div className="project-list">
      {enrollments.map((e) => (
        <div key={e.id} className="project-row" style={{ cursor: 'default' }}>
          <div>
            <div className="title">{e.student?.full_name || 'A student'}</div>
            <div className="meta">
              <span>{new Date(e.created_at).toLocaleDateString()}</span>
              <span>· {Number(e.amount_paid) === 0 ? 'Free' : formatMoney(e.amount_paid, e.currency)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className={`status-badge ${e.status === 'refunded' ? 'invoice-status-void' : 'invoice-status-paid'}`}>
              {STATUS_LABELS[e.status] || e.status}
            </span>
            {isOwner && e.status === 'paid' && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRefund(e.id)} disabled={pending}>
                Refund
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
