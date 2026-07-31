const LABELS = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  changes_requested: 'Changes requested',
};

export default function ApprovalStatusBadge({ status }) {
  return <span className={`status-badge approval-status-${status}`}>{LABELS[status] || status}</span>;
}
