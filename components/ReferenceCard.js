'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { extractDominantColors } from '@/lib/colorExtraction';
import { addColorToBrandKit, deleteReference, detectReferenceText, saveExtractedColors } from '@/lib/actions/references';
import { IconPlus, IconSparkles, IconTrash } from './icons';

export default function ReferenceCard({ projectId, reference }) {
  const router = useRouter();
  const [colors, setColors] = useState(reference.colors || []);
  const [extractError, setExtractError] = useState(null);
  const [detecting, startDetecting] = useTransition();
  const [detectedText, setDetectedText] = useState(reference.detected_text || []);
  const [addedHex, setAddedHex] = useState(null);
  const [pending, startTransition] = useTransition();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current || colors.length > 0 || !reference.url) return;
    attemptedRef.current = true;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const extracted = extractDominantColors(img, 6);
        setColors(extracted);
        await saveExtractedColors(reference.id, projectId, extracted);
      } catch {
        setExtractError('Could not read colors from this image (the source may not allow it).');
      }
    };
    img.onerror = () => setExtractError('Could not load this image to read its colors.');
    img.src = reference.url;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference.id]);

  function handleDetectText() {
    startDetecting(async () => {
      const result = await detectReferenceText(reference.id, projectId);
      if (!result?.error) setDetectedText(result.detectedText || []);
    });
  }

  function handleAddColor(hex, index) {
    startTransition(async () => {
      const result = await addColorToBrandKit(projectId, hex, `${reference.title} ${index + 1}`);
      if (!result?.error) {
        setAddedHex(hex);
        setTimeout(() => setAddedHex(null), 1800);
      }
    });
  }

  function handleDelete() {
    if (!confirm('Delete this reference?')) return;
    startTransition(async () => {
      const result = await deleteReference(reference.id, projectId);
      if (!result?.error) router.refresh();
    });
  }

  return (
    <div className="reference-card">
      <div className="reference-card-image">
        {reference.url && <img src={reference.url} alt={reference.title} />}
        <button
          type="button"
          className="reference-card-delete"
          onClick={handleDelete}
          disabled={pending}
          aria-label={`Delete ${reference.title}`}
        >
          <IconTrash />
        </button>
      </div>

      <div className="reference-card-body">
        {colors.length > 0 ? (
          <div className="reference-swatches">
            {colors.map((hex, i) => (
              <button
                key={hex}
                type="button"
                className="reference-swatch"
                style={{ background: hex }}
                title={`${hex} — add to Brand Kit`}
                onClick={() => handleAddColor(hex, i)}
                disabled={pending}
              >
                {addedHex === hex ? '✓' : ''}
              </button>
            ))}
          </div>
        ) : extractError ? (
          <p className="reference-card-error">{extractError}</p>
        ) : (
          <p className="reference-card-hint">Reading colors…</p>
        )}

        {detectedText.length > 0 ? (
          <ul className="reference-text-list">
            {detectedText.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleDetectText}
            disabled={detecting}
            style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconSparkles /> {detecting ? 'Reading…' : 'Detect text'}
          </button>
        )}
      </div>
    </div>
  );
}
