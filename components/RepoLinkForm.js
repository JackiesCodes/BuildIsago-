'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateRepoLink } from '@/lib/actions/devScope';

export default function RepoLinkForm({ devScopeId, projectId, currentRepo }) {
  const router = useRouter();
  const [value, setValue] = useState(currentRepo || '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function submit(nextValue) {
    setError(null);
    startTransition(async () => {
      const result = await updateRepoLink(devScopeId, projectId, nextValue);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <form
      className="devscope-repo-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="owner/repo or a github.com URL — public repos only"
        disabled={pending}
      />
      <button type="submit" className="btn btn-ghost btn-sm" disabled={pending}>
        {pending ? 'Linking…' : currentRepo ? 'Update' : 'Link repo'}
      </button>
      {currentRepo && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={pending}
          onClick={() => {
            setValue('');
            submit('');
          }}
        >
          Unlink
        </button>
      )}
      {error && <div className="form-error devscope-repo-form-error">{error}</div>}
    </form>
  );
}
