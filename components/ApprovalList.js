import Link from 'next/link';
import ApprovalStatusBadge from './ApprovalStatusBadge';

export default function ApprovalList({ approvals, basePath }) {
  if (!approvals?.length) {
    return (
      <div className="empty-state">
        <h3>No approval requests yet</h3>
        <p>Anything sent for the client to approve or weigh in on will show up here.</p>
      </div>
    );
  }

  return (
    <div className="project-list">
      {approvals.map((a) => (
        <Link key={a.id} href={`${basePath}/${a.id}`} className="project-row">
          <div>
            <div className="title">{a.title}</div>
            <div className="meta">
              <span>{new Date(a.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <ApprovalStatusBadge status={a.status} />
        </Link>
      ))}
    </div>
  );
}
