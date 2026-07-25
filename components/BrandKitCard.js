import Link from 'next/link';
import CreateBrandKitButton from './CreateBrandKitButton';

export default function BrandKitCard({ projectId, brandHref, brandKit }) {
  if (!brandKit) {
    return <CreateBrandKitButton projectId={projectId} />;
  }

  return (
    <div>
      <div className="brand-card-swatches">
        {(brandKit.colors || []).slice(0, 6).map((c, i) => (
          <span key={i} className="brand-card-swatch" style={{ background: c.hex }} title={`${c.name} ${c.hex}`} />
        ))}
        {!brandKit.colors?.length && (
          <span style={{ color: 'var(--muted-2)', fontSize: '0.85rem' }}>No colors set yet.</span>
        )}
      </div>
      <p className="brand-card-meta">
        {brandKit.heading_font} / {brandKit.body_font}
        {brandKit.tagline ? ` · "${brandKit.tagline}"` : ''}
      </p>
      <Link href={brandHref} className="btn btn-ghost btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>
        Open Brand Studio
      </Link>
    </div>
  );
}
