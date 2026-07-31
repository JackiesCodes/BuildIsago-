'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelRetainer } from '@/lib/actions/retainers';

export default function CancelRetainerButton({ retainerId, projectId }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleCancel() {
    if (!confirm('Cancel this retainer? Billing stops immediately and this cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelRetainer(retainerId, projectId);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={pending}>
        {pending ? 'Canceling…' : 'Cancel retainer'}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
