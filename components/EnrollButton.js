'use client';

import { useState, useTransition } from 'react';
import { buyCourse } from '@/lib/actions/academy';

export default function EnrollButton({ slug, price }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleEnroll() {
    setError(null);
    startTransition(async () => {
      const result = await buyCourse(slug);
      if (result?.error) setError(result.error);
      // On success the action redirects (to Stripe or straight into the course).
    });
  }

  return (
    <div>
      <button type="button" className="btn btn-primary" onClick={handleEnroll} disabled={pending}>
        {pending ? 'Redirecting…' : Number(price) === 0 ? 'Enroll for free' : 'Enroll now'}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
