import Link from 'next/link';
import ProductStatusBadge from './ProductStatusBadge';
import { formatMoney } from '@/lib/utils/money';

export default function ProductAdminList({ products }) {
  if (!products?.length) {
    return (
      <div className="empty-state">
        <h3>No products yet</h3>
        <p>UI kits, templates, and design systems you sell will show up here.</p>
      </div>
    );
  }

  return (
    <div className="project-list">
      {products.map((p) => (
        <Link key={p.id} href={`/dashboard/studio/products/${p.id}`} className="project-row">
          <div>
            <div className="title">{p.title}</div>
            <div className="meta">
              <span>{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {Number(p.price) === 0 ? 'Free' : formatMoney(p.price, p.currency)}
            </span>
            <ProductStatusBadge status={p.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
