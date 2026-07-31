import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import VentureApplicationForm from '@/components/VentureApplicationForm';
import MyVentureApplicationsList from '@/components/MyVentureApplicationsList';

export default async function MyVenturesPage() {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user) redirect('/login?next=/dashboard/ventures');
  if (profile?.role === 'studio') redirect('/dashboard/studio/ventures');

  const { data: applications } = await supabase
    .from('venture_applications')
    .select('id, venture_name, stage, status, promoted_venture_id, created_at')
    .eq('applicant_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ventures</h1>
          <p>Pitch a startup for BuildIsago to consider incubating, and track your submissions.</p>
        </div>
      </div>

      <div className="detail-grid">
        <VentureApplicationForm />
        <div className="card">
          <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Your pitches</h3>
          <MyVentureApplicationsList applications={applications || []} />
        </div>
      </div>
    </>
  );
}
