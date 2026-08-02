'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setEngagementMode } from '@/lib/actions/engagement';

const OPTIONS = [
  {
    value: 'managed',
    label: 'BuildIsago works with me',
    description:
      'The studio runs your projects. You get approvals to sign off, invoices to pay, and retainers alongside the studios.',
  },
  {
    value: 'self_serve',
    label: 'I work on my own',
    description:
      'Just the tools — Brand, Dev and Design Studios. Approvals, invoices and retainers stay out of the way.',
  },
];

export default function EngagementSettings({ mode }) {
  const router = useRouter();
  const [current, setCurrent] = useState(mode || 'managed');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function choose(value) {
    if (value === current || pending) return;
    const previous = current;
    setCurrent(value);
    setError(null);
    startTransition(async () => {
      const result = await setEngagementMode(value);
      if (result?.error) {
        setCurrent(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="engagement-options">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`engagement-option${current === opt.value ? ' active' : ''}`}
            onClick={() => choose(opt.value)}
            aria-pressed={current === opt.value}
            disabled={pending}
          >
            <span className="engagement-option-label">{opt.label}</span>
            <span className="engagement-option-desc">{opt.description}</span>
          </button>
        ))}
      </div>
      <p className="field-hint" style={{ marginTop: 12 }}>
        Anything the studio has already sent you stays visible either way — this only hides
        sections you have nothing in.
      </p>
      {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
