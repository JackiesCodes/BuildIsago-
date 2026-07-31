import RetainerStatusBadge from './RetainerStatusBadge';
import SubscribeRetainerButton from './SubscribeRetainerButton';
import CancelRetainerButton from './CancelRetainerButton';
import { formatMoney } from '@/lib/utils/money';

export default function RetainerView({ retainer, projectId, justSubscribed }) {
  return (
    <div className="card">
      <div className="brand-section-head">
        <h3>{retainer.title}</h3>
        <RetainerStatusBadge status={retainer.status} />
      </div>

      {justSubscribed && (
        <div className="form-success" style={{ marginBottom: 16 }}>
          {retainer.status === 'active'
            ? "You're subscribed — thank you!"
            : "Payment received — we're confirming it now. Refresh in a moment if the status below hasn't updated."}
        </div>
      )}

      {retainer.description && <p className="invoice-notes">{retainer.description}</p>}

      <p className="store-detail-price" style={{ fontSize: '1.2rem', marginBottom: 12 }}>
        {formatMoney(retainer.amount, retainer.currency)} / {retainer.interval}
      </p>

      {retainer.current_period_end && retainer.status === 'active' && (
        <p className="field-hint" style={{ marginBottom: 12 }}>
          Next bill: {new Date(retainer.current_period_end).toLocaleDateString()}
        </p>
      )}
      {retainer.status === 'past_due' && (
        <p className="field-hint" style={{ marginBottom: 12, color: 'var(--danger)' }}>
          The last payment failed — Stripe will retry automatically. Update your card if this continues.
        </p>
      )}
      {retainer.status === 'canceled' && retainer.canceled_at && (
        <p className="field-hint" style={{ marginBottom: 12 }}>
          Canceled {new Date(retainer.canceled_at).toLocaleString()}
        </p>
      )}

      <div className="brand-footer-actions" style={{ marginTop: 20 }}>
        {retainer.status === 'pending' && <SubscribeRetainerButton retainerId={retainer.id} projectId={projectId} />}
        {['active', 'past_due'].includes(retainer.status) && (
          <CancelRetainerButton retainerId={retainer.id} projectId={projectId} />
        )}
      </div>
    </div>
  );
}
