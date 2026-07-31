import { createClient } from '@/lib/supabase/server';
import MarketplaceHeader from '@/components/MarketplaceHeader';
import TalentProfileCard from '@/components/TalentProfileCard';

export const metadata = {
  title: 'Marketplace — BuildIsago',
  description: 'Freelance designers, developers, and creative talent available through BuildIsago.',
};

export default async function MarketplacePage() {
  const supabase = await createClient();
  const { data: talent } = await supabase.rpc('list_public_talent');

  return (
    <div className="store-page">
      <MarketplaceHeader />
      <div className="container store-container">
        <div className="page-head">
          <div>
            <h1>Marketplace</h1>
            <p>Freelance designers, developers, and creative talent — vetted through BuildIsago.</p>
          </div>
        </div>

        {!talent?.length ? (
          <div className="empty-state">
            <h3>No public profiles yet</h3>
            <p>Check back soon, or join the marketplace yourself from your dashboard.</p>
          </div>
        ) : (
          <div className="product-grid">
            {talent.map((t) => (
              <TalentProfileCard key={t.id} talent={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
