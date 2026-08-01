'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateInvoice,
  sendInvoice,
  markInvoicePaidManually,
  voidInvoice,
  deleteInvoice,
  refundInvoice,
} from '@/lib/actions/invoices';
import { computeInvoiceTotals, formatMoney } from '@/lib/utils/money';
import { CURRENCIES } from '@/lib/constants/currencies';
import { IconPlus, IconTrash } from './icons';
import InvoiceStatusBadge from './InvoiceStatusBadge';

function LineItemsEditor({ items, currency, onChange }) {
  function updateItem(i, field, value) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    onChange([...items, { description: '', quantity: 1, unit_price: 0 }]);
  }
  function removeItem(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="invoice-line-items">
      <div className="invoice-line-head">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span>Total</span>
        <span />
      </div>
      {items.map((item, i) => (
        <div className="invoice-line-row" key={i}>
          <input
            type="text"
            value={item.description || ''}
            onChange={(e) => updateItem(i, 'description', e.target.value)}
            placeholder="e.g. Brand identity design"
          />
          <input
            type="number"
            min="0"
            step="1"
            value={item.quantity ?? 1}
            onChange={(e) => updateItem(i, 'quantity', e.target.value)}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.unit_price ?? 0}
            onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
          />
          <span className="invoice-line-total">
            {formatMoney((Number(item.quantity) || 0) * (Number(item.unit_price) || 0), currency)}
          </span>
          <button type="button" onClick={() => removeItem(i)} aria-label="Remove line item">
            <IconTrash />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
        <IconPlus /> Add line item
      </button>
    </div>
  );
}

export default function InvoiceEditor({ invoice, projectId, isOwner }) {
  const router = useRouter();
  const [lineItems, setLineItems] = useState(
    invoice.line_items?.length ? invoice.line_items : [{ description: '', quantity: 1, unit_price: 0 }]
  );
  const [taxRate, setTaxRate] = useState(invoice.tax_rate || 0);
  const [currency, setCurrency] = useState(invoice.currency || 'usd');
  const [dueDate, setDueDate] = useState(invoice.due_date || '');
  const [notes, setNotes] = useState(invoice.notes || '');

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(invoice.updated_at);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const isDraft = invoice.status === 'draft';
  const { subtotal, taxAmount, total } = computeInvoiceTotals(lineItems, taxRate);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateInvoice(invoice.id, projectId, {
      lineItems: lineItems.filter((li) => li.description || Number(li.quantity) || Number(li.unit_price)),
      taxRate: Number(taxRate) || 0,
      currency,
      dueDate,
      notes,
    });
    setSaving(false);
    if (result?.error) setError(result.error);
    else setSavedAt(new Date().toISOString());
  }

  function handleSend() {
    if (!confirm('Send this invoice to the client? It can no longer be edited after sending.')) return;
    setError(null);
    startTransition(async () => {
      const result = await sendInvoice(invoice.id, projectId);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleMarkPaid() {
    if (!confirm('Mark this invoice as paid? Only use this for payments received outside Stripe.')) return;
    setError(null);
    startTransition(async () => {
      const result = await markInvoicePaidManually(invoice.id, projectId);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleVoid() {
    if (!confirm('Void this invoice? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const result = await voidInvoice(invoice.id, projectId);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleRefund() {
    if (!confirm('Refund this invoice through Stripe? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const result = await refundInvoice(invoice.id, projectId);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('Delete this draft invoice? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteInvoice(invoice.id, projectId);
      if (result?.error) setError(result.error);
      else router.push(`/dashboard/studio/${projectId}/invoices`);
    });
  }

  return (
    <div className="card">
      <div className="brand-section-head">
        <h3>{invoice.invoice_number}</h3>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      {isDraft ? (
        <>
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
              <label>Tax rate (%)</label>
              <input type="number" min="0" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
            <div className="field">
              <label>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <LineItemsEditor items={lineItems} currency={currency} onChange={setLineItems} />

          <div className="field" style={{ marginTop: 20 }}>
            <label>Notes (visible to client)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, thank-you note, etc."
            />
          </div>
        </>
      ) : (
        <>
          <div className="invoice-static-lines">
            {(invoice.line_items || []).map((li, i) => (
              <div className="invoice-static-row" key={i}>
                <span>{li.description}</span>
                <span>
                  {li.quantity} &times; {formatMoney(Number(li.unit_price) || 0, invoice.currency)}
                </span>
                <span>{formatMoney((Number(li.quantity) || 0) * (Number(li.unit_price) || 0), invoice.currency)}</span>
              </div>
            ))}
          </div>
          {invoice.notes && <p className="invoice-notes">{invoice.notes}</p>}
        </>
      )}

      <div className="invoice-totals">
        <div>
          <span>Subtotal</span>
          <span>{formatMoney(subtotal, currency)}</span>
        </div>
        {taxAmount > 0 && (
          <div>
            <span>Tax ({Number(taxRate)}%)</span>
            <span>{formatMoney(taxAmount, currency)}</span>
          </div>
        )}
        <div className="invoice-total-grand">
          <span>Total</span>
          <span>{formatMoney(total, currency)}</span>
        </div>
      </div>

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
        {invoice.status === 'sent' && (
          <>
            <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handleMarkPaid} disabled={pending}>
              Mark as paid
            </button>
            <button type="button" className="btn btn-danger" onClick={handleVoid} disabled={pending}>
              Void invoice
            </button>
          </>
        )}
        {invoice.status === 'paid' && (
          <>
            {invoice.paid_at && <span className="design-save-status">Paid {new Date(invoice.paid_at).toLocaleString()}</span>}
            {isOwner && invoice.stripe_payment_intent_id && (
              <button type="button" className="btn btn-danger" onClick={handleRefund} disabled={pending}>
                Refund
              </button>
            )}
          </>
        )}
        {invoice.status === 'void' && <span className="design-save-status">Voided</span>}
        {invoice.status === 'refunded' && (
          <span className="design-save-status">
            Refunded {invoice.refunded_at ? new Date(invoice.refunded_at).toLocaleString() : ''}
          </span>
        )}
      </div>
    </div>
  );
}
