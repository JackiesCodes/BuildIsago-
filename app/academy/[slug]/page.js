import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import AcademyHeader from '@/components/AcademyHeader';
import EnrollButton from '@/components/EnrollButton';
import LessonOutlineList from '@/components/LessonOutlineList';
import { publicCourseCoverUrl } from '@/lib/utils/storage';
import { courseLevelLabel } from '@/lib/constants/courseLevels';
import { formatMoney } from '@/lib/utils/money';

export default async function CourseDetailPage({ params }) {
  const { slug } = await params;
  const { user, supabase } = await getSessionProfile();

  const { data: course } = await supabase.rpc('get_published_course', { p_slug: slug }).maybeSingle();
  if (!course) notFound();

  let alreadyEnrolled = false;
  if (user) {
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('course_id', course.id)
      .eq('student_id', user.id)
      .eq('status', 'paid')
      .maybeSingle();
    alreadyEnrolled = Boolean(enrollment);
  }

  const { data: lessons } = await supabase.rpc('list_course_lessons_public', { p_course_id: course.id });
  const coverUrl = publicCourseCoverUrl(supabase, course.cover_image_path);

  return (
    <div className="store-page">
      <AcademyHeader />
      <div className="container store-container">
        <Link href="/academy" className="back-link">
          &larr; Back to Academy
        </Link>

        <div className="store-detail-grid">
          <div className="store-detail-image">
            {coverUrl ? <img src={coverUrl} alt="" /> : <div className="product-card-placeholder" />}
          </div>
          <div>
            <span className="service-tag">{courseLevelLabel(course.level)}</span>
            <h1>{course.title}</h1>
            <p className="store-detail-price">
              {Number(course.price) === 0 ? 'Free' : formatMoney(course.price, course.currency)}
            </p>
            <p className="store-detail-desc">{course.description}</p>
            {alreadyEnrolled ? (
              <Link href={`/dashboard/academy/${course.id}`} className="btn btn-primary">
                Continue learning
              </Link>
            ) : (
              <EnrollButton slug={course.slug} price={course.price} />
            )}
          </div>
        </div>

        <LessonOutlineList lessons={lessons || []} />
      </div>
    </div>
  );
}
