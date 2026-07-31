'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  updateCourse,
  publishCourse,
  unpublishCourse,
  archiveCourse,
  deleteCourse,
} from '@/lib/actions/academy';
import { COURSE_LEVELS } from '@/lib/constants/courseLevels';
import { CURRENCIES } from '@/lib/constants/currencies';
import CourseStatusBadge from './CourseStatusBadge';
import CourseCoverUploader from './CourseCoverUploader';
import LessonManager from './LessonManager';

export default function CourseEditor({ course, coverUrl, lessons }) {
  const router = useRouter();
  const [title, setTitle] = useState(course.title || '');
  const [slug, setSlug] = useState(course.slug || '');
  const [description, setDescription] = useState(course.description || '');
  const [level, setLevel] = useState(course.level || 'beginner');
  const [price, setPrice] = useState(course.price ?? 0);
  const [currency, setCurrency] = useState(course.currency || 'usd');

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(course.updated_at);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateCourse(course.id, { title, slug, description, level, price, currency });
    setSaving(false);
    if (result?.error) setError(result.error);
    else {
      setSavedAt(new Date().toISOString());
      router.refresh();
    }
  }

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishCourse(course.id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleUnpublish() {
    setError(null);
    startTransition(async () => {
      const result = await unpublishCourse(course.id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleArchive() {
    if (!confirm('Archive this course? It will be taken off the catalog.')) return;
    setError(null);
    startTransition(async () => {
      const result = await archiveCourse(course.id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('Delete this course? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCourse(course.id);
      if (result?.error) setError(result.error);
      else router.push('/dashboard/studio/academy');
    });
  }

  return (
    <>
      <div className="card">
        <div className="brand-section-head">
          <h3>{title || 'New Course'}</h3>
          <CourseStatusBadge status={course.status} />
        </div>

        <div className="invoice-meta-row">
          <div className="field">
            <label>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Brand Design Fundamentals" />
          </div>
          <div className="field">
            <label>URL slug</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="brand-design-fundamentals" />
          </div>
          <div className="field">
            <label>Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              {COURSE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="invoice-meta-row">
          <div className="field">
            <label>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Price (0 for free)</label>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div />
        </div>

        <div className="field">
          <label>Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this course covers, who it's for, what they'll be able to do after."
          />
        </div>

        <div className="invoice-meta-row" style={{ marginTop: 8 }}>
          <div>
            <p
              className="field-hint"
              style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}
            >
              Cover image
            </p>
            <CourseCoverUploader courseId={course.id} coverUrl={coverUrl} />
          </div>
          <div />
          <div />
        </div>

        {error && (
          <div className="form-error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <div className="brand-footer-actions" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {course.status !== 'published' && (
            <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handlePublish} disabled={pending}>
              Publish
            </button>
          )}
          {course.status === 'published' && (
            <>
              <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handleUnpublish} disabled={pending}>
                Unpublish
              </button>
              <Link href={`/academy/${course.slug}`} className="btn btn-ghost" style={{ width: 'auto' }} target="_blank">
                View live
              </Link>
            </>
          )}
          {course.status !== 'archived' && (
            <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handleArchive} disabled={pending}>
              Archive
            </button>
          )}
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={pending}>
            Delete
          </button>
          <span className="design-save-status">
            {savedAt ? `Saved ${new Date(savedAt).toLocaleString()}` : 'Not saved yet'}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 14 }}>Lessons</h4>
        <LessonManager courseId={course.id} lessons={lessons} />
      </div>
    </>
  );
}
