'use client';

import { useState, useTransition } from 'react';
import { getProductDownloadUrl } from '@/lib/actions/products';

export default function DownloadProductButton({ productId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleDownload() {
    setError(null);
    startTransition(async () => {
      const result = await getProductDownloadUrl(productId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      window.location.href = result.url;
    });
  }

  return (
    <div>
      <button type="button" className="btn btn-primary btn-sm" onClick={handleDownload} disabled={pending}>
        {pending ? 'Preparing…' : 'Download'}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}
