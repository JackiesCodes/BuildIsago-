'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createLesson, updateLesson, deleteLesson, moveLesson } from '@/lib/actions/academy';
import { IconPlus, IconTrash } from './icons';

function LessonRow({ lesson, isFirst, isLast }) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title || '');
  const [contentType, setContentType] = useState(lesson.content_type || 'video');
  const [videoUrl, setVideoUrl] = useState(lesson.video_url || '');
  const [body, setBody] = useState(lesson.body || '');
  const [durationMinutes, setDurationMinutes] = useState(lesson.duration_minutes ?? '');
  const [isPreview, setIsPreview] = useState(Boolean(lesson.is_preview));
  const [saving, setSaving] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateLesson(lesson.id, { title, contentType, videoUrl, body, durationMinutes, isPreview });
    setSaving(false);
    if (result?.error) setError(result.error);
    else router.refresh();
  }

  function handleDelete() {
    if (!confirm('Remove this lesson? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteLesson(lesson.id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleMove(direction) {
    setError(null);
    startTransition(async () => {
      const result = await moveLesson(lesson.id, direction);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="brand-section-head">
        <h4 style={{ margin: 0 }}>{title || 'New Lesson'}</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleMove('up')} disabled={pending || isFirst}>
            &uarr;
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleMove('down')} disabled={pending || isLast}>
            &darr;
          </button>
        </div>
      </div>

      <div className="invoice-meta-row">
        <div className="field">
          <label>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Type</label>
          <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
            <option value="video">Video</option>
            <option value="text">Text</option>
          </select>
        </div>
        <div className="field">
          <label>Duration (minutes)</label>
          <input
            type="number"
            min="0"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      {contentType === 'video' && (
        <div className="field">
          <label>Video URL (YouTube, Vimeo, Loom, etc.)</label>
          <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
        </div>
      )}

      <div className="field">
        <label>{contentType === 'video' ? 'Notes (optional, shown alongside the video)' : 'Lesson text'}</label>
        <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} />
        Free preview (visible to anyone before enrolling)
      </label>

      {error && (
        <div className="form-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div className="brand-footer-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save lesson'}
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={pending}>
          <IconTrash /> Remove
        </button>
      </div>
    </div>
  );
}

export default function LessonManager({ courseId, lessons }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await createLesson(courseId);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      {!lessons?.length ? (
        <div className="empty-state" style={{ marginBottom: 16 }}>
          <h3>No lessons yet</h3>
          <p>Add the first lesson to start building this course.</p>
        </div>
      ) : (
        lessons.map((lesson, i) => (
          <LessonRow key={lesson.id} lesson={lesson} isFirst={i === 0} isLast={i === lessons.length - 1} />
        ))
      )}

      <button
        type="button"
        className="btn btn-ghost"
        style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        onClick={handleAdd}
        disabled={pending}
      >
        <IconPlus /> Add lesson
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
