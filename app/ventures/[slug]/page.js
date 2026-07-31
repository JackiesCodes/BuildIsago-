import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VenturesHeader from '@/components/VenturesHeader';
import { publicVentureLogoUrl } from '@/lib/utils/storage';
import { ventureStageLabel } from '@/lib/constants/ventureStages';

export default async function VentureDetailPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: venture } = await supabase.rpc('get_published_venture', { p_slug: slug }).maybeSingle();
  if (!venture) notFound();

  const logoUrl = publicVentureLogoUrl(supabase, venture.logo_path);

  return (
    <div className="store-page">
      <VenturesHeader />
      <div className="container store-container">
        <Link href="/ventures" className="back-link">
          &larr; Back to Ventures
        </Link>

        <div className="store-detail-grid">
          <div className="store-detail-image">
            {logoUrl ? <img src={logoUrl} alt="" /> : <div className="product-card-placeholder" />}
          </div>
          <div>
            <span className="service-tag">{ventureStageLabel(venture.stage)}</span>
            <h1>{venture.name}</h1>
            {venture.tagline && <p className="store-detail-price">{venture.tagline}</p>}
            <p className="store-detail-desc">{venture.description}</p>
            {venture.website_url && (
              <a href={venture.website_url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ width: 'auto' }}>
                Visit website
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
