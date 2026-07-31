'use client';

import { useState, useTransition } from 'react';
import { createProduct } from '@/lib/actions/products';
import { IconPlus } from './icons';

export default function NewProductButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createProduct();
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
        <IconPlus /> {pending ? 'Creating…' : 'New Product'}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
