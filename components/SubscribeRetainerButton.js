'use client';

import { useState, useTransition } from 'react';
import { subscribeToRetainer } from '@/lib/actions/retainers';

export default function SubscribeRetainerButton({ retainerId, projectId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      const result = await subscribeToRetainer(retainerId, projectId);
      if (result?.error) setError(result.error);
      // On success the action redirects to Stripe Checkout.
    });
  }

  return (
    <div>
      <button type="button" className="btn btn-primary" onClick={handleSubscribe} disabled={pending}>
        {pending ? 'Redirecting…' : 'Start this retainer'}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
