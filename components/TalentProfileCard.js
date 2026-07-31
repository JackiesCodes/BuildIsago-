import Link from 'next/link';
import { talentDisciplineLabel } from '@/lib/constants/talentDisciplines';
import { formatMoney } from '@/lib/utils/money';

export default function TalentProfileCard({ talent }) {
  return (
    <Link href={`/marketplace/${talent.id}`} className="product-card">
      <div className="product-card-body">
        <span className="service-tag">{talentDisciplineLabel(talent.discipline)}</span>
        <h3>{talent.full_name}</h3>
        {talent.specialties?.length > 0 && (
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0 }}>
            {talent.specialties.slice(0, 3).join(', ')}
          </p>
        )}
        {talent.rate != null && (
          <span className="product-card-price">
            {formatMoney(talent.rate, talent.rate_currency)}/{talent.rate_unit === 'project' ? 'project' : 'hr'}
          </span>
        )}
      </div>
    </Link>
  );
}
