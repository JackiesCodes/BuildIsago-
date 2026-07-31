'use client';

import { useState, useTransition } from 'react';
import { createInvoiceCheckoutSession } from '@/lib/actions/invoices';

export default function PayInvoiceButton({ invoiceId, projectId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handlePay() {
    setError(null);
    startTransition(async () => {
      const result = await createInvoiceCheckoutSession(invoiceId, projectId);
      if (result?.error) setError(result.error);
      // On success the action redirects to Stripe Checkout — nothing more to do here.
    });
  }

  return (
    <div>
      <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={handlePay} disabled={pending}>
        {pending ? 'Redirecting to checkout…' : 'Pay now'}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
