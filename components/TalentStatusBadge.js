const LABELS = { active: 'Active', inactive: 'Inactive' };

export default function TalentStatusBadge({ status }) {
  return <span className={`status-badge talent-status-${status}`}>{LABELS[status] || status}</span>;
}
