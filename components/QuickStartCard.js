'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { IconArrowRight, IconCode, IconLayers, IconPalette, IconPenTool } from './icons';
import { startSelfServeProject } from '@/lib/actions/startProject';

// Resolved here rather than passed in: a component is a function, and
// functions can't cross the server/client boundary as props — doing so
// throws at runtime while still compiling cleanly.
const SERVICE_ICONS = {
  software: IconCode,
  branding: IconPalette,
  design: IconPenTool,
  multiple: IconLayers,
};

/**
 * Managed accounts brief the studio first, so the card opens the New
 * Project form. Self-serve accounts are opening a tool for themselves —
 * the card creates the project and drops them straight into the studio.
 */
export default function QuickStartCard({ value, label, description, selfServe }) {
  const Icon = SERVICE_ICONS[value] || IconLayers;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function open() {
    setError(null);
    startTransition(async () => {
      // On success this redirects and never returns a value; only a
      // failure comes back, so silence here would look like a dead card.
      const result = await startSelfServeProject(value);
      if (result?.error) setError(result.error);
    });
  }

  if (!selfServe) {
    return (
      <Link href={`/dashboard/client/new?service=${value}`} className="quick-start-card">
        <span className="quick-start-icon">
          <Icon />
        </span>
        <span className="quick-start-title">{label}</span>
        <span className="quick-start-desc">{description}</span>
        <span className="quick-start-go">
          Start <IconArrowRight />
        </span>
      </Link>
    );
  }

  return (
    <button type="button" className="quick-start-card" disabled={pending} onClick={open}>
      <span className="quick-start-head">
        <span className="quick-start-icon">
          <Icon />
        </span>
        <IconArrowRight className="quick-start-corner" />
      </span>
      <span className="quick-start-title">{label}</span>
      <span className="quick-start-desc">{pending ? 'Opening…' : description}</span>
      {error && <span className="quick-start-error">{error}</span>}
    </button>
  );
}
