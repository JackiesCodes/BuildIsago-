'use client';

/**
 * Last resort: this replaces the root layout, so it fires when the layout
 * itself fails — which is exactly when app/error.js can't help, because
 * error.js renders *inside* the layout that just broke.
 *
 * It therefore has to supply its own <html> and <body>, and it cannot rely
 * on globals.css having been applied. Every style here is inline and the
 * colours are hard-coded rather than tokens, because a stylesheet that
 * failed to load is one of the things that lands you here. It follows the
 * OS theme via a small media query so it doesn't flash white on a dark
 * screen.
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: '#08090b',
          color: '#e9edf1',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          lineHeight: 1.6,
        }}
      >
        <style>{`
          @media (prefers-color-scheme: light) {
            body { background: #f7f9fa !important; color: #10171d !important; }
            .ge-sub { color: #4a5560 !important; }
          }
        `}</style>
        <main style={{ maxWidth: 460, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, margin: '0 0 10px' }}>
            BuildIsago couldn&apos;t load
          </h1>
          <p className="ge-sub" style={{ margin: '0 0 22px', color: '#9aa4ae' }}>
            Something failed before the page could start. Reloading usually clears it.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              font: 'inherit',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: '#0b8b9e',
              color: '#fff',
            }}
          >
            Reload
          </button>
          {error?.digest && (
            <p className="ge-sub" style={{ marginTop: 20, fontSize: '0.8rem', color: '#9aa4ae' }}>
              Reference {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
