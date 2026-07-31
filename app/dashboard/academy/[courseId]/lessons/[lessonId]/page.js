import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import LessonCompleteToggle from '@/components/LessonCompleteToggle';
import { toEmbedUrl } from '@/lib/utils/videoEmbed';

export default async function LessonPage({ params }) {
  const { courseId, lessonId } = await params;
  const { supabase } = await getSessionProfile();

  const { data: lessons } = await supabase.rpc('get_course_lessons_for_student', { p_course_id: courseId });
  if (!lessons) notFound();

  const index = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[index];
  if (!lesson || (!lesson.video_url && !lesson.body && !lesson.is_preview)) notFound();

  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const embedUrl = lesson.content_type === 'video' ? toEmbedUrl(lesson.video_url) : null;

  return (
    <>
      <Link href={`/dashboard/academy/${courseId}`} className="back-link">
        &larr; Back to course
      </Link>

      <div className="page-head">
        <div>
          <h1>{lesson.title}</h1>
          {lesson.duration_minutes ? <p>{lesson.duration_minutes} min</p> : null}
        </div>
      </div>

      <div className="card">
        {embedUrl ? (
          <div className="course-video-embed" style={{ marginBottom: lesson.body ? 20 : 0 }}>
            <iframe src={embedUrl} title={lesson.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>
        ) : lesson.video_url ? (
          <a
            href={lesson.video_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            style={{ width: 'auto', marginBottom: lesson.body ? 20 : 0 }}
          >
            Watch video
          </a>
        ) : null}

        {lesson.body && <p style={{ color: 'var(--muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{lesson.body}</p>}

        <div className="brand-footer-actions" style={{ marginTop: 20 }}>
          <LessonCompleteToggle lessonId={lesson.id} completed={lesson.completed} />
          {prev && (
            <Link href={`/dashboard/academy/${courseId}/lessons/${prev.id}`} className="btn btn-ghost" style={{ width: 'auto' }}>
              &larr; {prev.title}
            </Link>
          )}
          {next && (
            <Link href={`/dashboard/academy/${courseId}/lessons/${next.id}`} className="btn btn-ghost" style={{ width: 'auto' }}>
              {next.title} &rarr;
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
