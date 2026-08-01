'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { refundProductPurchase } from '@/lib/actions/products';
import { formatMoney } from '@/lib/utils/money';

const STATUS_LABELS = { paid: 'Paid', refunded: 'Refunded' };

export default function ProductSalesList({ purchases, isOwner }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRefund(purchaseId) {
    if (!confirm('Refund this purchase through Stripe? This cannot be undone.')) return;
    startTransition(async () => {
      const result = await refundProductPurchase(purchaseId);
      if (result?.error) alert(result.error);
      else router.refresh();
    });
  }

  if (!purchases?.length) {
    return <p style={{ color: 'var(--muted-2)', fontSize: '0.88rem' }}>No sales yet.</p>;
  }

  return (
    <div className="project-list">
      {purchases.map((p) => (
        <div key={p.id} className="project-row" style={{ cursor: 'default' }}>
          <div>
            <div className="title">{p.buyer?.full_name || 'A buyer'}</div>
            <div className="meta">
              <span>{new Date(p.created_at).toLocaleDateString()}</span>
              <span>· {Number(p.amount_paid) === 0 ? 'Free' : formatMoney(p.amount_paid, p.currency)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className={`status-badge ${p.status === 'refunded' ? 'invoice-status-void' : 'invoice-status-paid'}`}>
              {STATUS_LABELS[p.status] || p.status}
            </span>
            {isOwner && p.status === 'paid' && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRefund(p.id)} disabled={pending}>
                Refund
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
