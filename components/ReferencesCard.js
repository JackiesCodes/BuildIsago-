import Link from 'next/link';

export default function ReferencesCard({ referencesHref, count }) {
  return (
    <div>
      <p className="brand-card-meta">
        {count ? `${count} reference${count === 1 ? '' : 's'} saved` : 'No references yet'}
      </p>
      <Link href={referencesHref} className="btn btn-ghost btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>
        Open References
      </Link>
    </div>
  );
}
