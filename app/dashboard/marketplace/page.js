import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import MyTalentProfileEditor from '@/components/MyTalentProfileEditor';
import TalentRequestsList from '@/components/TalentRequestsList';
import JoinMarketplaceButton from '@/components/JoinMarketplaceButton';

export default async function MyMarketplacePage() {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user) redirect('/login?next=/dashboard/marketplace');
  if (profile?.role === 'studio') redirect('/dashboard/studio/talent');

  const { data: talent } = await supabase.from('talent').select('*').eq('profile_id', user.id).maybeSingle();

  let requests = [];
  if (talent) {
    const { data } = await supabase
      .from('talent_requests')
      .select('id, message, status, created_at')
      .eq('talent_id', talent.id)
      .order('created_at', { ascending: false });
    requests = data || [];
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Marketplace</h1>
          <p>Manage your public profile and see who&apos;s reached out.</p>
        </div>
      </div>

      {!talent ? (
        <div className="card" style={{ maxWidth: 480 }}>
          <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
            List yourself on the BuildIsago Marketplace so clients can find and hire you for extra design or
            development capacity.
          </p>
          <JoinMarketplaceButton />
        </div>
      ) : (
        <div className="detail-grid">
          <MyTalentProfileEditor talent={talent} />
          <div className="card">
            <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Inquiries</h3>
            <TalentRequestsList requests={requests} />
          </div>
        </div>
      )}
    </>
  );
}
