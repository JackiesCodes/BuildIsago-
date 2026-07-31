import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import TalentList from '@/components/TalentList';
import NewTalentButton from '@/components/NewTalentButton';

export default async function StudioTalentPage() {
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: talent } = await supabase
    .from('talent')
    .select('id, full_name, discipline, specialties, rate, rate_currency, rate_unit, status')
    .order('status', { ascending: true })
    .order('full_name', { ascending: true });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Talent</h1>
          <p>Freelance designers, developers, and creative talent you can pull in for extra capacity.</p>
        </div>
        <NewTalentButton />
      </div>

      <TalentList talent={talent || []} />
    </>
  );
}
