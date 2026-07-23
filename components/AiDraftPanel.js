'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { generateAiDraft, updateAiDraft } from '@/lib/actions/ai-draft';
import { IconSparkles } from '@/components/icons';

export default function AiDraftPanel({ projectId, draft, generatedAt }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(draft || '');

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateAiDraft(projectId);
      if (result?.error) {
        setError(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function startEditing() {
    setDraftValue(draft || '');
    setError(null);
    setEditing(true);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateAiDraft(projectId, draftValue);
      if (result?.error) {
        setError(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (editing) {
    return (
      <div>
        <textarea
          className="ai-draft-editor"
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          rows={14}
          disabled={pending}
        />
        {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
        <div className="ai-draft-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={pending}>
            {pending ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setEditing(false)}
            disabled={pending}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {draft ? (
        <>
          <div className="ai-draft-content">
            <ReactMarkdown>{draft}</ReactMarkdown>
          </div>
          {generatedAt && (
            <p className="ai-draft-meta">
              Last updated {new Date(generatedAt).toLocaleString()}
            </p>
          )}
        </>
      ) : (
        <p style={{ color: 'var(--muted-2)', fontSize: '0.85rem', marginBottom: 14 }}>
          Get an instant AI-generated starting point for this project — a scope, a brand
          direction, or a creative direction, based on the brief. You can edit it afterward.
        </p>
      )}

      {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}

      <div className="ai-draft-actions" style={{ marginTop: draft ? 14 : 0 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleGenerate}
          disabled={pending}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconSparkles />
          {pending ? 'Generating…' : draft ? 'Regenerate Draft' : 'Generate AI First Draft'}
        </button>
        {draft && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={startEditing} disabled={pending}>
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
