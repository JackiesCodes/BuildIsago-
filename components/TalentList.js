import Link from 'next/link';
import TalentStatusBadge from './TalentStatusBadge';
import { talentDisciplineLabel } from '@/lib/constants/talentDisciplines';
import { formatMoney } from '@/lib/utils/money';

export default function TalentList({ talent }) {
  if (!talent?.length) {
    return (
      <div className="empty-state">
        <h3>No talent added yet</h3>
        <p>Freelance designers, developers, and creative talent you can pull in for extra capacity will show up here.</p>
      </div>
    );
  }

  return (
    <div className="project-list">
      {talent.map((t) => (
        <Link key={t.id} href={`/dashboard/studio/talent/${t.id}`} className="project-row">
          <div>
            <div className="title">{t.full_name}</div>
            <div className="meta">
              <span className="service-tag">{talentDisciplineLabel(t.discipline)}</span>
              {t.specialties?.length > 0 && <span>· {t.specialties.slice(0, 3).join(', ')}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {t.rate != null && (
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(t.rate, t.rate_currency)}/{t.rate_unit === 'project' ? 'project' : 'hr'}
              </span>
            )}
            <TalentStatusBadge status={t.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
