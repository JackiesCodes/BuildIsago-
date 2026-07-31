import Link from 'next/link';
import ApprovalStatusBadge from './ApprovalStatusBadge';
import DecideApprovalForm from './DecideApprovalForm';

export default function ApprovalView({ approval, projectId, linkedDesign }) {
  return (
    <div className="card">
      <div className="brand-section-head">
        <h3>{approval.title}</h3>
        <ApprovalStatusBadge status={approval.status} />
      </div>

      <p className="invoice-notes">{approval.description}</p>

      {linkedDesign && (
        <p style={{ marginBottom: 16 }}>
          <Link href={`/design/${projectId}/${linkedDesign.id}`} className="devscope-repo-name" style={{ fontSize: '0.9rem' }}>
            View linked design: {linkedDesign.title}
          </Link>
        </p>
      )}

      {approval.status === 'pending' && <DecideApprovalForm approvalId={approval.id} projectId={projectId} />}

      {approval.status !== 'pending' && (
        <div className="approval-decision">
          <span className="approval-decision-label">
            {approval.status === 'approved' ? 'You approved this' : 'You requested changes'}
            {approval.decided_at ? ` · ${new Date(approval.decided_at).toLocaleString()}` : ''}
          </span>
          {approval.feedback && <p className="approval-feedback">{approval.feedback}</p>}
        </div>
      )}
    </div>
  );
}
