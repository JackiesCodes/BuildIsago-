'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createReference, importReferenceFromUrl } from '@/lib/actions/references';
import { IconImage, IconPlus } from './icons';

export default function ReferenceUploader({ projectId }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [importing, startImporting] = useTransition();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);

  async function handleFiles(fileList) {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const storagePath = `${projectId}/references/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(storagePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await createReference(projectId, storagePath, file.name, null);
    setUploading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    if (inputRef.current) inputRef.current.value = '';
    router.refresh();
  }

  function handleImportUrl() {
    if (!url.trim()) return;
    setError(null);
    startImporting(async () => {
      const result = await importReferenceFromUrl(projectId, url.trim());
      if (result?.error) {
        setError(result.error);
      } else {
        setUrl('');
        router.refresh();
      }
    });
  }

  const busy = uploading || importing;

  return (
    <div className="reference-uploader">
      <label
        className={`upload-drop${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) handleFiles(e.dataTransfer.files);
        }}
      >
        {uploading ? (
          'Uploading…'
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IconImage /> {dragging ? 'Drop to upload' : 'Click or drag an image here'}
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      <div className="reference-url-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="…or paste an image URL (e.g. a Pinterest pin's image link)"
          disabled={busy}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleImportUrl} disabled={busy || !url.trim()}>
          <IconPlus /> {importing ? 'Importing…' : 'Import'}
        </button>
      </div>

      {error && <div className="form-error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
