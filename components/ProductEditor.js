'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  updateProduct,
  publishProduct,
  unpublishProduct,
  archiveProduct,
  deleteProduct,
} from '@/lib/actions/products';
import { PRODUCT_CATEGORIES } from '@/lib/constants/productCategories';
import { CURRENCIES } from '@/lib/constants/currencies';
import ProductStatusBadge from './ProductStatusBadge';
import ProductPreviewUploader from './ProductPreviewUploader';
import ProductFileUploader from './ProductFileUploader';

function fileDisplayName(path) {
  if (!path) return null;
  const base = path.split('/').pop();
  return base?.replace(/^\d+-/, '');
}

export default function ProductEditor({ product, previewUrl }) {
  const router = useRouter();
  const [title, setTitle] = useState(product.title || '');
  const [slug, setSlug] = useState(product.slug || '');
  const [description, setDescription] = useState(product.description || '');
  const [category, setCategory] = useState(product.category || 'ui_kit');
  const [price, setPrice] = useState(product.price ?? 0);
  const [currency, setCurrency] = useState(product.currency || 'usd');

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(product.updated_at);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateProduct(product.id, { title, slug, description, category, price, currency });
    setSaving(false);
    if (result?.error) setError(result.error);
    else {
      setSavedAt(new Date().toISOString());
      router.refresh();
    }
  }

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishProduct(product.id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleUnpublish() {
    setError(null);
    startTransition(async () => {
      const result = await unpublishProduct(product.id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleArchive() {
    if (!confirm('Archive this product? It will be taken off the storefront.')) return;
    setError(null);
    startTransition(async () => {
      const result = await archiveProduct(product.id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result?.error) setError(result.error);
      else router.push('/dashboard/studio/products');
    });
  }

  return (
    <div className="card">
      <div className="brand-section-head">
        <h3>{title || 'New Product'}</h3>
        <ProductStatusBadge status={product.status} />
      </div>

      <div className="invoice-meta-row">
        <div className="field">
          <label>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Startup Dashboard UI Kit" />
        </div>
        <div className="field">
          <label>URL slug</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="startup-dashboard-ui-kit" />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="invoice-meta-row">
        <div className="field">
          <label>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Price (0 for free)</label>
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div />
      </div>

      <div className="field">
        <label>Description</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's in the kit, what it's for, who it's for."
        />
      </div>

      <div className="invoice-meta-row" style={{ marginTop: 8 }}>
        <div>
          <p className="field-hint" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
            Preview image
          </p>
          <ProductPreviewUploader productId={product.id} previewUrl={previewUrl} />
        </div>
        <div>
          <p className="field-hint" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
            Downloadable file
          </p>
          <ProductFileUploader productId={product.id} fileName={fileDisplayName(product.file_path)} />
        </div>
        <div />
      </div>

      {error && (
        <div className="form-error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      <div className="brand-footer-actions" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {product.status !== 'published' && (
          <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handlePublish} disabled={pending}>
            Publish
          </button>
        )}
        {product.status === 'published' && (
          <>
            <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handleUnpublish} disabled={pending}>
              Unpublish
            </button>
            <Link href={`/store/${product.slug}`} className="btn btn-ghost" style={{ width: 'auto' }} target="_blank">
              View live
            </Link>
          </>
        )}
        {product.status !== 'archived' && (
          <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handleArchive} disabled={pending}>
            Archive
          </button>
        )}
        <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={pending}>
          Delete
        </button>
        <span className="design-save-status">
          {savedAt ? `Saved ${new Date(savedAt).toLocaleString()}` : 'Not saved yet'}
        </span>
      </div>
    </div>
  );
}
