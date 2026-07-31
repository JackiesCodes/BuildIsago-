import Link from 'next/link';
import { getSessionProfile } from '@/lib/supabase/server';

export default async function MyCoursesPage({ searchParams }) {
  const { enrolled } = await searchParams;
  const { supabase } = await getSessionProfile();

  const { data: enrollments } = await supabase.rpc('get_my_enrollments');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My Courses</h1>
          <p>Everything you&apos;ve enrolled in from BuildIsago Academy.</p>
        </div>
        <Link href="/academy" className="btn btn-ghost" style={{ width: 'auto' }}>
          Browse Academy
        </Link>
      </div>

      {enrolled && (
        <div className="form-success" style={{ marginBottom: 24 }}>
          You&apos;re enrolled — start learning below.
        </div>
      )}

      {!enrollments?.length ? (
        <div className="empty-state">
          <h3>No courses yet</h3>
          <p>Anything you enroll in from the Academy will show up here.</p>
        </div>
      ) : (
        <div className="project-list">
          {enrollments.map((e) => (
            <Link key={e.enrollment_id} href={`/dashboard/academy/${e.course_id}`} className="project-row">
              <div>
                <div className="title">{e.course_title}</div>
                <div className="meta">
                  <span>{new Date(e.enrolled_at).toLocaleDateString()}</span>
                  <span>
                    · {Number(e.completed_count) || 0} / {Number(e.lesson_count) || 0} lessons complete
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
