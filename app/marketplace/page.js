import { createClient } from '@/lib/supabase/server';
import MarketplaceHeader from '@/components/MarketplaceHeader';
import TalentProfileCard from '@/components/TalentProfileCard';
import { logError } from '@/lib/logging';

export const metadata = {
  title: 'Marketplace — BuildIsago',
  description: 'Freelance designers, developers, and creative talent available through BuildIsago.',
};

export default async function MarketplacePage() {
  const supabase = await createClient();
  const { data: talent, error } = await supabase.rpc('list_public_talent');
  if (error) await logError('marketplace.list_public_talent', error);

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
            <h3>{error ? 'Something went wrong' : 'No public profiles yet'}</h3>
            <p>
              {error
                ? "We couldn't load the marketplace right now — please try again shortly."
                : 'Check back soon, or join the marketplace yourself from your dashboard.'}
            </p>
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
