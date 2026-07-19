const LABELS = {
  intake: 'Intake',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
};

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{LABELS[status] || status}</span>;
}
