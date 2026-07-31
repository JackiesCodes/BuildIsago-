import Link from 'next/link';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import { computeInvoiceTotals, formatMoney } from '@/lib/utils/money';

export default function InvoiceList({ invoices, basePath }) {
  if (!invoices?.length) {
    return (
      <div className="empty-state">
        <h3>No invoices yet</h3>
        <p>Invoices for this project will show up here.</p>
      </div>
    );
  }

  return (
    <div className="project-list">
      {invoices.map((inv) => {
        const { total } = computeInvoiceTotals(inv.line_items, inv.tax_rate);
        return (
          <Link key={inv.id} href={`${basePath}/${inv.id}`} className="project-row">
            <div>
              <div className="title">{inv.invoice_number}</div>
              <div className="meta">
                <span>{new Date(inv.created_at).toLocaleDateString()}</span>
                {inv.due_date && <span>· Due {new Date(`${inv.due_date}T00:00:00`).toLocaleDateString()}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(total, inv.currency)}
              </span>
              <InvoiceStatusBadge status={inv.status} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
