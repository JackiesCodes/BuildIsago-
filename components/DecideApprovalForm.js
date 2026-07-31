'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { decideApproval } from '@/lib/actions/approvals';

export default function DecideApprovalForm({ approvalId, projectId }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleDecide(decision) {
    setError(null);
    startTransition(async () => {
      const result = await decideApproval(approvalId, projectId, decision, feedback);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="field">
        <label>Notes (required if requesting changes)</label>
        <textarea
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Anything the studio should know…"
        />
      </div>
      {error && (
        <div className="form-error" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}
      <div className="brand-footer-actions" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={() => handleDecide('approved')} disabled={pending}>
          {pending ? 'Submitting…' : 'Approve'}
        </button>
        <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={() => handleDecide('changes_requested')} disabled={pending}>
          Request changes
        </button>
      </div>
    </div>
  );
}
