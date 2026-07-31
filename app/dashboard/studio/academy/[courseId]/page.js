import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import CourseEditor from '@/components/CourseEditor';
import { publicCourseCoverUrl } from '@/lib/utils/storage';

export default async function StudioCourseDetail({ params }) {
  const { courseId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).single();
  if (!course) notFound();

  const { data: lessons } = await supabase
    .from('course_lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('lesson_position', { ascending: true });

  const coverUrl = publicCourseCoverUrl(supabase, course.cover_image_path);

  return (
    <>
      <Link href="/dashboard/studio/academy" className="back-link">
        &larr; Back to Academy
      </Link>

      <div className="page-head">
        <div>
          <h1>Edit Course</h1>
        </div>
      </div>

      <CourseEditor course={course} coverUrl={coverUrl} lessons={lessons || []} />
    </>
  );
}
