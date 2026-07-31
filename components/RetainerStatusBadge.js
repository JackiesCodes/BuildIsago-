const LABELS = {
  draft: 'Draft',
  pending: 'Pending',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
};

export default function RetainerStatusBadge({ status }) {
  return <span className={`status-badge retainer-status-${status}`}>{LABELS[status] || status}</span>;
}
