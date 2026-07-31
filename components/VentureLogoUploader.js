'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { recordVentureLogo } from '@/lib/actions/ventures';

export default function VentureLogoUploader({ ventureId, logoUrl }) {
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
    const storagePath = `${ventureId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from('venture-logos').upload(storagePath, file, {
      upsert: true,
    });
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await recordVentureLogo(ventureId, storagePath);
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
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          style={{ width: '100%', maxWidth: 200, borderRadius: 'var(--radius-sm)', marginBottom: 12, display: 'block' }}
        />
      )}
      <label className="upload-drop">
        {uploading ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Click or drag a logo here'}
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
