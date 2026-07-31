'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { recordProductPreview } from '@/lib/actions/products';

export default function ProductPreviewUploader({ productId, previewUrl }) {
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
    const storagePath = `${productId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from('product-previews').upload(storagePath, file, {
      upsert: true,
    });
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await recordProductPreview(productId, storagePath);
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
      {previewUrl && (
        <img
          src={previewUrl}
          alt=""
          style={{ width: '100%', maxWidth: 320, borderRadius: 'var(--radius-sm)', marginBottom: 12, display: 'block' }}
        />
      )}
      <label className="upload-drop">
        {uploading ? 'Uploading…' : previewUrl ? 'Replace preview image' : 'Click or drag a preview image here'}
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
