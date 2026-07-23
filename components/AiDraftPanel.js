'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { generateAiDraft } from '@/lib/actions/ai-draft';

export default function AiDraftPanel({ projectId, draft, generatedAt }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateAiDraft(projectId);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
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
              Generated {new Date(generatedAt).toLocaleString()}
            </p>
          )}
        </>
      ) : (
        <p style={{ color: 'var(--muted-2)', fontSize: '0.85rem', marginBottom: 14 }}>
          Get an instant AI-generated starting point for this project — a scope, a brand
          direction, or a creative direction, based on the brief.
        </p>
      )}

      {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={handleGenerate}
        disabled={pending}
        style={{ marginTop: draft ? 14 : 0 }}
      >
        {pending ? 'Generating…' : draft ? 'Regenerate Draft' : 'Generate AI First Draft'}
      </button>
    </div>
  );
}
