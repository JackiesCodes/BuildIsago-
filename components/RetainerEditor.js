'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateRetainer, sendRetainer, deleteRetainer } from '@/lib/actions/retainers';
import { CURRENCIES } from '@/lib/constants/currencies';
import { BILLING_INTERVALS } from '@/lib/constants/billingIntervals';
import { formatMoney } from '@/lib/utils/money';
import RetainerStatusBadge from './RetainerStatusBadge';
import CancelRetainerButton from './CancelRetainerButton';

export default function RetainerEditor({ retainer, projectId }) {
  const router = useRouter();
  const [title, setTitle] = useState(retainer.title || '');
  const [description, setDescription] = useState(retainer.description || '');
  const [amount, setAmount] = useState(retainer.amount ?? 0);
  const [currency, setCurrency] = useState(retainer.currency || 'usd');
  const [interval, setInterval] = useState(retainer.interval || 'month');

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(retainer.updated_at);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const isDraft = retainer.status === 'draft';

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateRetainer(retainer.id, projectId, { title, description, amount, currency, interval });
    setSaving(false);
    if (result?.error) setError(result.error);
    else setSavedAt(new Date().toISOString());
  }

  function handleSend() {
    if (!confirm('Send this retainer to the client? It can no longer be edited after sending.')) return;
    setError(null);
    startTransition(async () => {
      const result = await sendRetainer(retainer.id, projectId);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('Delete this draft retainer? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteRetainer(retainer.id, projectId);
      if (result?.error) setError(result.error);
      else router.push(`/dashboard/studio/${projectId}/retainers`);
    });
  }

  return (
    <div className="card">
      <div className="brand-section-head">
        <h3>{isDraft ? title || 'Retainer' : retainer.title}</h3>
        <RetainerStatusBadge status={retainer.status} />
      </div>

      {isDraft ? (
        <>
          <div className="field">
            <label>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly Design Retainer" />
          </div>
          <div className="invoice-meta-row">
            <div className="field">
              <label>Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Amount per billing cycle</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field">
              <label>Bills every</label>
              <select value={interval} onChange={(e) => setInterval(e.target.value)}>
                {BILLING_INTERVALS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>What&apos;s included</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What ongoing work this covers each billing cycle."
            />
          </div>
        </>
      ) : (
        <>
          {retainer.description && <p className="invoice-notes">{retainer.description}</p>}
          <p className="store-detail-price" style={{ fontSize: '1.2rem', marginBottom: 12 }}>
            {formatMoney(retainer.amount, retainer.currency)} / {retainer.interval}
          </p>
          {retainer.current_period_end && retainer.status === 'active' && (
            <p className="field-hint" style={{ marginBottom: 12 }}>
              Next bill: {new Date(retainer.current_period_end).toLocaleDateString()}
            </p>
          )}
          {retainer.status === 'canceled' && retainer.canceled_at && (
            <p className="field-hint" style={{ marginBottom: 12 }}>
              Canceled {new Date(retainer.canceled_at).toLocaleString()}
            </p>
          )}
        </>
      )}

      {error && (
        <div className="form-error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      <div className="brand-footer-actions" style={{ marginTop: 20 }}>
        {isDraft && (
          <>
            <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handleSend} disabled={pending}>
              {pending ? 'Sending…' : 'Send to client'}
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={pending}>
              Delete
            </button>
            <span className="design-save-status">
              {savedAt ? `Saved ${new Date(savedAt).toLocaleString()}` : 'Not saved yet'}
            </span>
          </>
        )}
        {retainer.status === 'pending' && (
          <span className="design-save-status">Waiting on the client to start this retainer.</span>
        )}
        {['pending', 'active', 'past_due'].includes(retainer.status) && (
          <CancelRetainerButton retainerId={retainer.id} projectId={projectId} />
        )}
        {retainer.status === 'canceled' && <span className="design-save-status">This retainer has ended.</span>}
      </div>
    </div>
  );
}
