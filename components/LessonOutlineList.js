'use client';

import { useState } from 'react';
import { IconLock, IconPlayCircle } from './icons';
import { toEmbedUrl } from '@/lib/utils/videoEmbed';

function PreviewLesson({ lesson }) {
  const [open, setOpen] = useState(false);
  const embedUrl = lesson.content_type === 'video' ? toEmbedUrl(lesson.video_url) : null;

  return (
    <div className="course-lesson-row">
      <button type="button" className="course-lesson-toggle" onClick={() => setOpen((o) => !o)}>
        <IconPlayCircle />
        <span>{lesson.title}</span>
        {lesson.duration_minutes ? <span className="field-hint" style={{ margin: 0 }}>{lesson.duration_minutes} min</span> : null}
        <span className="status-badge invoice-status-sent" style={{ marginLeft: 'auto' }}>
          Free preview
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {embedUrl ? (
            <div className="course-video-embed">
              <iframe src={embedUrl} title={lesson.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
            </div>
          ) : lesson.video_url ? (
            <a href={lesson.video_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              Watch video
            </a>
          ) : null}
          {lesson.body && <p style={{ color: 'var(--muted)', whiteSpace: 'pre-wrap', marginTop: 12 }}>{lesson.body}</p>}
        </div>
      )}
    </div>
  );
}

export default function LessonOutlineList({ lessons }) {
  if (!lessons?.length) return null;

  return (
    <div className="course-lesson-list">
      {lessons.map((lesson) =>
        lesson.is_preview ? (
          <PreviewLesson key={lesson.id} lesson={lesson} />
        ) : (
          <div key={lesson.id} className="course-lesson-row">
            <div className="course-lesson-toggle" style={{ cursor: 'default' }}>
              <IconLock />
              <span>{lesson.title}</span>
              {lesson.duration_minutes ? (
                <span className="field-hint" style={{ margin: 0 }}>
                  {lesson.duration_minutes} min
                </span>
              ) : null}
            </div>
          </div>
        )
      )}
    </div>
  );
}
