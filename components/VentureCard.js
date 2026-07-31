import Link from 'next/link';
import { ventureStageLabel } from '@/lib/constants/ventureStages';

export default function VentureCard({ venture }) {
  return (
    <Link href={`/ventures/${venture.slug}`} className="product-card">
      <div className="product-card-image">
        {venture.logoUrl ? <img src={venture.logoUrl} alt="" /> : <div className="product-card-placeholder" />}
      </div>
      <div className="product-card-body">
        <span className="service-tag">{ventureStageLabel(venture.stage)}</span>
        <h3>{venture.name}</h3>
        {venture.tagline && (
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0 }}>{venture.tagline}</p>
        )}
      </div>
    </Link>
  );
}
