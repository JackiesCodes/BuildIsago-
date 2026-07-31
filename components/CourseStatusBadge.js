const LABELS = { draft: 'Draft', published: 'Published', archived: 'Archived' };

export default function CourseStatusBadge({ status }) {
  return <span className={`status-badge product-status-${status}`}>{LABELS[status] || status}</span>;
}
