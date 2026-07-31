'use client';

import { useState, useTransition } from 'react';
import { createInvoice } from '@/lib/actions/invoices';
import { IconPlus } from './icons';

export default function NewInvoiceButton({ projectId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createInvoice(projectId);
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
        <IconPlus /> {pending ? 'Creating…' : 'New Invoice'}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
