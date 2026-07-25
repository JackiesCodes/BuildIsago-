'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrandKit } from '@/lib/actions/brandKit';

export default function CreateBrandKitButton({ projectId }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createBrandKit(projectId);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <p style={{ color: 'var(--muted-2)', fontSize: '0.85rem', marginBottom: 14 }}>
        Set up a color palette, typography, and brand voice — with a shareable guidelines
        page you can hand to anyone.
      </p>
      <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={handleCreate} disabled={pending}>
        {pending ? 'Creating…' : 'Create Brand Kit'}
      </button>
      {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
