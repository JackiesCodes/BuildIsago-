'use client';

import { useState, useTransition } from 'react';
import { buyProduct } from '@/lib/actions/products';

export default function BuyProductButton({ slug, price }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleBuy() {
    setError(null);
    startTransition(async () => {
      const result = await buyProduct(slug);
      if (result?.error) setError(result.error);
      // On success the action redirects (to Stripe or straight to Downloads).
    });
  }

  return (
    <div>
      <button type="button" className="btn btn-primary" onClick={handleBuy} disabled={pending}>
        {pending ? 'Redirecting…' : Number(price) === 0 ? 'Get it free' : 'Buy now'}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
