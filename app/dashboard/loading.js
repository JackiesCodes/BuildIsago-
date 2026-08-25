/**
 * Every dashboard page queries Supabase before it can render anything, so
 * without this the app showed the previous page frozen until the server
 * answered — no feedback that a click had registered.
 *
 * Skeleton rather than a spinner: these pages are lists and cards, and a
 * shape that matches what's coming reads as loading rather than as broken.
 * Marked aria-hidden with a live-region label alongside, so a screen
 * reader hears "Loading" once instead of a dozen meaningless boxes.
 */
export default function DashboardLoading() {
  return (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        Loading
      </span>
      <div className="skeleton-page" aria-hidden="true">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton-grid">
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      </div>
    </>
  );
}
