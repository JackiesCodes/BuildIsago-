'use client';

import { useState, useTransition } from 'react';
import { joinMarketplace } from '@/lib/actions/marketplace';

export default function JoinMarketplaceButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleJoin() {
    setError(null);
    startTransition(async () => {
      const result = await joinMarketplace();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <button type="button" className="btn btn-primary" onClick={handleJoin} disabled={pending}>
        {pending ? 'Setting up your profile…' : 'Join as Talent'}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
