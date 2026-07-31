'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { recordCourseCover } from '@/lib/actions/academy';

export default function CourseCoverUploader({ courseId, coverUrl }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFiles(fileList) {
    const file = fileList?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const supabase = createClient();
    const storagePath = `${courseId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from('course-covers').upload(storagePath, file, {
      upsert: true,
    });
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await recordCourseCover(courseId, storagePath);
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
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          style={{ width: '100%', maxWidth: 320, borderRadius: 'var(--radius-sm)', marginBottom: 12, display: 'block' }}
        />
      )}
      <label className="upload-drop">
        {uploading ? 'Uploading…' : coverUrl ? 'Replace cover image' : 'Click or drag a cover image here'}
        <input ref={inputRef} type="file" accept="image/*" disabled={uploading} onChange={(e) => handleFiles(e.target.files)} />
      </label>
      {error && (
        <div className="form-error" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  );
}
