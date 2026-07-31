'use client';

import { useState, useTransition } from 'react';
import { createApproval } from '@/lib/actions/approvals';
import { IconPlus } from './icons';

export default function NewApprovalButton({ projectId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createApproval(projectId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary"
        style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        onClick={handleCreate}
        disabled={pending}
      >
        <IconPlus /> {pending ? 'Creating…' : 'New Approval Request'}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
