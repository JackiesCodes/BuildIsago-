import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MarketplaceHeader from '@/components/MarketplaceHeader';
import ContactTalentForm from '@/components/ContactTalentForm';
import { talentDisciplineLabel } from '@/lib/constants/talentDisciplines';
import { formatMoney } from '@/lib/utils/money';

export default async function TalentProfilePage({ params }) {
  const { talentId } = await params;
  const supabase = await createClient();

  const { data: talent } = await supabase.rpc('get_public_talent', { p_id: talentId }).maybeSingle();
  if (!talent) notFound();

  return (
    <div className="store-page">
      <MarketplaceHeader />
      <div className="container store-container">
        <Link href="/marketplace" className="back-link">
          &larr; Back to Marketplace
        </Link>

        <div className="store-detail-grid">
          <div>
            <span className="service-tag">{talentDisciplineLabel(talent.discipline)}</span>
            <h1>{talent.full_name}</h1>
            {talent.rate != null && (
              <p className="store-detail-price">
                {formatMoney(talent.rate, talent.rate_currency)}/{talent.rate_unit === 'project' ? 'project' : 'hr'}
              </p>
            )}
            {talent.bio && <p className="store-detail-desc">{talent.bio}</p>}
            {talent.specialties?.length > 0 && (
              <p style={{ marginBottom: 20 }}>
                {talent.specialties.map((s) => (
                  <span key={s} className="service-tag" style={{ marginRight: 12 }}>
                    {s}
                  </span>
                ))}
              </p>
            )}
            {talent.portfolio_url && (
              <p style={{ marginBottom: 20 }}>
                <a href={talent.portfolio_url} target="_blank" rel="noreferrer" className="devscope-repo-name" style={{ fontSize: '0.9rem' }}>
                  View portfolio
                </a>
              </p>
            )}
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Get in touch</h3>
            <ContactTalentForm talentId={talent.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
