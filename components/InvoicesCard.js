import Link from 'next/link';
import { computeInvoiceTotals, formatMoney } from '@/lib/utils/money';

export default function InvoicesCard({ invoicesHref, invoices }) {
  if (!invoices?.length) {
    return (
      <div>
        <p className="brand-card-meta">No invoices yet</p>
        <Link href={invoicesHref} className="btn btn-ghost btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>
          Open Invoices
        </Link>
      </div>
    );
  }

  const outstanding = invoices.filter((i) => i.status === 'sent');
  const singleCurrency = new Set(outstanding.map((i) => i.currency)).size <= 1;
  const outstandingTotal = outstanding.reduce((sum, i) => sum + computeInvoiceTotals(i.line_items, i.tax_rate).total, 0);

  return (
    <div>
      <p className="brand-card-meta">
        {invoices.length} invoice{invoices.length === 1 ? '' : 's'}
        {outstanding.length
          ? ` · ${singleCurrency ? formatMoney(outstandingTotal, outstanding[0].currency) : `${outstanding.length} unpaid`} outstanding`
          : ' · all settled'}
      </p>
      <Link href={invoicesHref} className="btn btn-ghost btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>
        Open Invoices
      </Link>
    </div>
  );
}
