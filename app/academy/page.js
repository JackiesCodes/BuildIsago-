import { createClient } from '@/lib/supabase/server';
import AcademyHeader from '@/components/AcademyHeader';
import CourseCard from '@/components/CourseCard';
import { publicCourseCoverUrl } from '@/lib/utils/storage';

export const metadata = {
  title: 'Academy — BuildIsago',
  description: 'Training and skills-development courses from BuildIsago — design, development, and creative fundamentals.',
};

export default async function AcademyPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase.rpc('list_published_courses');

  const withUrls = (courses || []).map((c) => ({
    ...c,
    coverUrl: publicCourseCoverUrl(supabase, c.cover_image_path),
  }));

  return (
    <div className="store-page">
      <AcademyHeader />
      <div className="container store-container">
        <div className="page-head">
          <div>
            <h1>BuildIsago Academy</h1>
            <p>Training and skills development — practical courses in design, development, and the creative craft.</p>
          </div>
        </div>

        {!withUrls.length ? (
          <div className="empty-state">
            <h3>Nothing here yet</h3>
            <p>Check back soon — new courses are on the way.</p>
          </div>
        ) : (
          <div className="product-grid">
            {withUrls.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
