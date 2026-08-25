'use client';

import Link from 'next/link';

/**
 * Catches render and data-fetch failures anywhere below the root layout.
 * Before this, an uncaught error showed Next.js's bare "Application error:
 * a server-side exception has occurred" — no branding, no way back, and
 * nothing the person could tell you afterwards.
 *
 * Error boundaries are client components by definition, so this can't call
 * logError() (that needs the admin client). Next.js has already logged the
 * error server-side by the time this renders; `digest` is the id that ties
 * what the user sees to that log line, which is why it's on screen.
 */
export default function Error({ error, reset }) {
  return (
    <div className="status-page">
      <div className="status-page-inner">
        <img src="/logo-icon.png" alt="" className="status-page-mark" />
        <p className="status-page-code">Error</p>
        <h1>Something went wrong on our side</h1>
        <p className="status-page-body">
          This one is ours, not yours. Trying again often works — the most common cause is a
          brief connection problem rather than anything wrong with your account.
        </p>
        <div className="status-page-actions">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            Go to your dashboard
          </Link>
        </div>
        {error?.digest && (
          <p className="status-page-digest">
            Reference <code>{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}
