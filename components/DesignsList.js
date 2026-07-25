'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createDesign, deleteDesign } from '@/lib/actions/designs';
import { DESIGN_FORMATS } from '@/lib/constants/designFormats';
import { IconPlus } from './icons';

export default function DesignsList({ projectId, designs }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [format, setFormat] = useState(DESIGN_FORMATS[0].value);
  const [error, setError] = useState(null);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createDesign(projectId, format);
      if (result?.error) setError(result.error);
    });
  }

  function handleDelete(designId) {
    if (!confirm('Delete this design? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteDesign(designId, projectId);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      {!designs?.length && (
        <p style={{ color: 'var(--muted-2)', fontSize: '0.85rem', marginBottom: 14 }}>
          Create social posts, presentation slides, or flyers right here — export as PNG or
          PDF when you&apos;re done.
        </p>
      )}

      {designs?.length > 0 && (
        <div className="design-grid">
          {designs.map((d) => (
            <div key={d.id} className="design-card">
              <Link href={`/design/${projectId}/${d.id}`} className="design-card-link">
                <span className="design-card-format">
                  {d.width}&times;{d.height}
                </span>
                <span className="design-card-title">{d.title}</span>
              </Link>
              <button
                type="button"
                className="design-card-delete"
                onClick={() => handleDelete(d.id)}
                disabled={pending}
                aria-label={`Delete ${d.title}`}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="form-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      {creating ? (
        <div className="design-create-row">
          <select value={format} onChange={(e) => setFormat(e.target.value)} disabled={pending}>
            {DESIGN_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label} ({f.width}&times;{f.height})
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate} disabled={pending}>
            {pending ? 'Creating…' : 'Create'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setCreating(false)}
            disabled={pending}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setCreating(true)}
          style={{ marginTop: designs?.length ? 14 : 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconPlus />
          New Design
        </button>
      )}
    </div>
  );
}
