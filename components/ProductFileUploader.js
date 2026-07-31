'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { recordProductFile } from '@/lib/actions/products';

export default function ProductFileUploader({ productId, fileName }) {
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

    const { error: uploadError } = await supabase.storage.from('product-files').upload(storagePath, file, {
      upsert: true,
    });
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await recordProductFile(productId, storagePath);
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
      {fileName && <p className="field-hint" style={{ marginBottom: 10 }}>Current file: {fileName}</p>}
      <label className="upload-drop">
        {uploading ? 'Uploading…' : fileName ? 'Replace downloadable file' : 'Click or drag the downloadable file here'}
        <input ref={inputRef} type="file" disabled={uploading} onChange={(e) => handleFiles(e.target.files)} />
      </label>
      {error && (
        <div className="form-error" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  );
}
