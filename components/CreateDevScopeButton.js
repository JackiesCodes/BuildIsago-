'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDevScope } from '@/lib/actions/devScope';

export default function CreateDevScopeButton({ projectId }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createDevScope(projectId);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <p style={{ color: 'var(--muted-2)', fontSize: '0.85rem', marginBottom: 14 }}>
        Break the brief into features, tech stack, build phases, and risks — and link a
        public GitHub repo to see live issues and commits right here.
      </p>
      <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={handleCreate} disabled={pending}>
        {pending ? 'Creating…' : 'Create Technical Scope'}
      </button>
      {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
