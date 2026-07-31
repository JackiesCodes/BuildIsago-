import InvoiceStatusBadge from './InvoiceStatusBadge';
import PayInvoiceButton from './PayInvoiceButton';
import { computeInvoiceTotals, formatMoney } from '@/lib/utils/money';

export default function InvoiceView({ invoice, projectId, justPaid }) {
  const { subtotal, taxAmount, total } = computeInvoiceTotals(invoice.line_items, invoice.tax_rate);

  return (
    <div className="card">
      <div className="brand-section-head">
        <h3>{invoice.invoice_number}</h3>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      {justPaid && (
        <div className="form-success" style={{ marginBottom: 16 }}>
          {invoice.status === 'paid'
            ? 'Payment received — thank you!'
            : "Payment received — we're confirming it now. Refresh in a moment if the status below hasn't updated."}
        </div>
      )}

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

      <div className="invoice-totals">
        <div>
          <span>Subtotal</span>
          <span>{formatMoney(subtotal, invoice.currency)}</span>
        </div>
        {taxAmount > 0 && (
          <div>
            <span>Tax ({Number(invoice.tax_rate)}%)</span>
            <span>{formatMoney(taxAmount, invoice.currency)}</span>
          </div>
        )}
        <div className="invoice-total-grand">
          <span>Total</span>
          <span>{formatMoney(total, invoice.currency)}</span>
        </div>
      </div>

      {invoice.due_date && invoice.status === 'sent' && (
        <p className="invoice-notes">Due {new Date(`${invoice.due_date}T00:00:00`).toLocaleDateString()}</p>
      )}

      <div className="brand-footer-actions" style={{ marginTop: 20 }}>
        {invoice.status === 'sent' && <PayInvoiceButton invoiceId={invoice.id} projectId={projectId} />}
        {invoice.status === 'paid' && invoice.paid_at && (
          <span className="design-save-status">Paid {new Date(invoice.paid_at).toLocaleString()}</span>
        )}
        {invoice.status === 'void' && <span className="design-save-status">This invoice was voided.</span>}
      </div>
    </div>
  );
}
