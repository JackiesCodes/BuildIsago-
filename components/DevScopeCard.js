import Link from 'next/link';
import CreateDevScopeButton from './CreateDevScopeButton';

export default function DevScopeCard({ projectId, devHref, devScope }) {
  if (!devScope) {
    return <CreateDevScopeButton projectId={projectId} />;
  }

  const featureCount = devScope.features?.length || 0;
  const repoLabel =
    devScope.repo_owner && devScope.repo_name ? `${devScope.repo_owner}/${devScope.repo_name}` : null;

  return (
    <div>
      <p className="brand-card-meta">
        {featureCount} feature{featureCount === 1 ? '' : 's'} scoped
        {repoLabel ? ` · linked to ${repoLabel}` : ' · no repo linked yet'}
      </p>
      <Link href={devHref} className="btn btn-ghost btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>
        Open Dev Studio
      </Link>
    </div>
  );
}
