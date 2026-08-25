import Link from 'next/link';

export const metadata = { title: 'Page not found' };

/**
 * Covers every notFound() in the app — 22 call sites at the time of
 * writing, including public ones like a mistyped /store/<slug> that a
 * customer or a crawler will hit. Without this they got Next.js's
 * unstyled default.
 */
export default function NotFound() {
  return (
    <div className="status-page">
      <div className="status-page-inner">
        <img src="/logo-icon.png" alt="" className="status-page-mark" />
        <p className="status-page-code">404</p>
        <h1>We couldn&apos;t find that page</h1>
        <p className="status-page-body">
          The link may be out of date, or the item may have been unpublished since you last
          saw it.
        </p>
        <div className="status-page-actions">
          <Link href="/" className="btn btn-primary">
            Go to your dashboard
          </Link>
          <Link href="/store" className="btn btn-ghost">
            Browse the store
          </Link>
        </div>
      </div>
    </div>
  );
}
