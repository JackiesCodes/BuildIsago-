import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import { IconCheck, IconLock, IconPlayCircle } from '@/components/icons';

export default async function CourseLessonsPage({ params }) {
  const { courseId } = await params;
  const { profile, supabase } = await getSessionProfile();

  const { data: enrollments } = await supabase.rpc('get_my_enrollments');
  const enrollment = (enrollments || []).find((e) => e.course_id === courseId);
  if (!enrollment && profile?.role !== 'studio') notFound();

  const { data: lessons } = await supabase.rpc('get_course_lessons_for_student', { p_course_id: courseId });
  if (!lessons) notFound();

  const completedCount = lessons.filter((l) => l.completed).length;

  return (
    <>
      <Link href="/dashboard/academy" className="back-link">
        &larr; Back to My Courses
      </Link>

      <div className="page-head">
        <div>
          <h1>{enrollment?.course_title || 'Course'}</h1>
          <p>
            {completedCount} / {lessons.length} lessons complete
          </p>
        </div>
      </div>

      <div className="course-lesson-list">
        {lessons.map((lesson) => {
          const locked = !lesson.video_url && !lesson.body && !lesson.is_preview;
          return (
            <Link
              key={lesson.id}
              href={locked ? '#' : `/dashboard/academy/${courseId}/lessons/${lesson.id}`}
              className="course-lesson-row"
              style={locked ? { pointerEvents: 'none', opacity: 0.6 } : undefined}
            >
              <div className="course-lesson-toggle">
                {lesson.completed ? <IconCheck /> : locked ? <IconLock /> : <IconPlayCircle />}
                <span>{lesson.title}</span>
                {lesson.duration_minutes ? (
                  <span className="field-hint" style={{ margin: 0 }}>
                    {lesson.duration_minutes} min
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
