'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { recordUploadedFile } from '@/lib/actions/messages';

export default function FileUploader({ projectId }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  async function handleFiles(fileList) {
    const file = fileList?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const supabase = createClient();
    const storagePath = `${projectId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(storagePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await recordUploadedFile(projectId, file.name, storagePath);
    setUploading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    if (inputRef.current) inputRef.current.value = '';
    router.refresh();
  }

  return (
    <div>
      <label
        className={`upload-drop${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!uploading) handleFiles(e.dataTransfer.files);
        }}
      >
        {uploading ? 'Uploading…' : dragging ? 'Drop to upload' : 'Click or drag a file here'}
        <input
          ref={inputRef}
          type="file"
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {error && <div className="form-error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
