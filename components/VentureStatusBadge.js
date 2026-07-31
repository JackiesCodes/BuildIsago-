const LABELS = { draft: 'Draft', published: 'Published', archived: 'Archived' };

export default function VentureStatusBadge({ status }) {
  return <span className={`status-badge product-status-${status}`}>{LABELS[status] || status}</span>;
}
