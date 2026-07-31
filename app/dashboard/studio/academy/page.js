import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import CourseAdminList from '@/components/CourseAdminList';
import NewCourseButton from '@/components/NewCourseButton';

export default async function StudioAcademyPage() {
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, status, price, currency, created_at')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Academy</h1>
          <p>Training and skills-development courses — BuildIsago Academy.</p>
        </div>
        <NewCourseButton />
      </div>

      <CourseAdminList courses={courses || []} />
    </>
  );
}
