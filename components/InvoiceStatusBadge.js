const LABELS = { draft: 'Draft', sent: 'Sent', paid: 'Paid', void: 'Void' };

export default function InvoiceStatusBadge({ status }) {
  return <span className={`status-badge invoice-status-${status}`}>{LABELS[status] || status}</span>;
}
