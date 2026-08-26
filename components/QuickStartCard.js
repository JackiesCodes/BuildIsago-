'use client';

import { useState, useTransition } from 'react';
import {
  IconArrowRight,
  IconCode,
  IconLayers,
  IconPalette,
  IconPenTool,
  IconSparkles,
} from './icons';
import { startSelfServeProject } from '@/lib/actions/startProject';

// Resolved here rather than passed in: a component is a function, and
// functions can't cross the server/client boundary as props — doing so
// throws at runtime while still compiling cleanly.
const SERVICE_ICONS = {
  software: IconCode,
  branding: IconPalette,
  design: IconPenTool,
  product: IconLayers,
  media: IconSparkles,
};

/**
 * Every card creates the project and opens its tool. There is no longer a
 * managed variant that sends you to a brief form first: the portal is
 * self-service, so clicking the thing you want gives you the thing you
 * want.
 */
export default function QuickStartCard({ value, label, description }) {
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
