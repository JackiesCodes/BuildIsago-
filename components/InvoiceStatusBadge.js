const LABELS = { draft: 'Draft', sent: 'Sent', paid: 'Paid', void: 'Void', refunded: 'Refunded' };

export default function InvoiceStatusBadge({ status }) {
  // Reuses the void styling — both are terminal, non-payable states.
  const styleKey = status === 'refunded' ? 'void' : status;
  return <span className={`status-badge invoice-status-${styleKey}`}>{LABELS[status] || status}</span>;
}
