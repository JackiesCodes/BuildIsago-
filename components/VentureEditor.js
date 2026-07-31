'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  updateVenture,
  publishVenture,
  unpublishVenture,
  archiveVenture,
  deleteVenture,
} from '@/lib/actions/ventures';
import { VENTURE_STAGES } from '@/lib/constants/ventureStages';
import { CURRENCIES } from '@/lib/constants/currencies';
import VentureStatusBadge from './VentureStatusBadge';
import VentureLogoUploader from './VentureLogoUploader';

export default function VentureEditor({ venture, logoUrl }) {
  const router = useRouter();
  const [name, setName] = useState(venture.name || '');
  const [slug, setSlug] = useState(venture.slug || '');
  const [tagline, setTagline] = useState(venture.tagline || '');
  const [description, setDescription] = useState(venture.description || '');
  const [stage, setStage] = useState(venture.stage || 'idea');
  const [equityPercentage, setEquityPercentage] = useState(venture.equity_percentage ?? '');
  const [investmentAmount, setInvestmentAmount] = useState(venture.investment_amount ?? '');
  const [currency, setCurrency] = useState(venture.currency || 'usd');
  const [websiteUrl, setWebsiteUrl] = useState(venture.website_url || '');
  const [founderName, setFounderName] = useState(venture.founder_name || '');
  const [founderEmail, setFounderEmail] = useState(venture.founder_email || '');
  const [notes, setNotes] = useState(venture.notes || '');

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(venture.updated_at);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateVenture(venture.id, {
      name,
      slug,
      tagline,
      description,
      stage,
      equityPercentage,
      investmentAmount,
      currency,
      websiteUrl,
      founderName,
      founderEmail,
      notes,
    });
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
      const result = await publishVenture(venture.id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleUnpublish() {
    setError(null);
    startTransition(async () => {
      const result = await unpublishVenture(venture.id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleArchive() {
    if (!confirm('Archive this venture? It will be taken off the public portfolio.')) return;
    setError(null);
    startTransition(async () => {
      const result = await archiveVenture(venture.id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('Delete this venture? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteVenture(venture.id);
      if (result?.error) setError(result.error);
      else router.push('/dashboard/studio/ventures');
    });
  }

  return (
    <div className="card">
      <div className="brand-section-head">
        <h3>{name || 'New Venture'}</h3>
        <VentureStatusBadge status={venture.status} />
      </div>

      <div className="invoice-meta-row">
        <div className="field">
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nimbus Labs" />
        </div>
        <div className="field">
          <label>URL slug</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="nimbus-labs" />
        </div>
        <div className="field">
          <label>Stage</label>
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            {VENTURE_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Tagline</label>
        <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One sentence, for the portfolio card." />
      </div>

      <div className="field">
        <label>Description (public, shown on the portfolio page)</label>
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="field">
        <label>Website URL</label>
        <input type="text" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…" />
      </div>

      <div className="invoice-meta-row" style={{ marginTop: 8 }}>
        <div>
          <p
            className="field-hint"
            style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}
          >
            Logo
          </p>
          <VentureLogoUploader ventureId={venture.id} logoUrl={logoUrl} />
        </div>
        <div />
        <div />
      </div>

      <div className="devscope-section">
        <h4>Deal details (private, studio only)</h4>
        <div className="invoice-meta-row">
          <div className="field">
            <label>Equity (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={equityPercentage}
              onChange={(e) => setEquityPercentage(e.target.value)}
              placeholder="Optional"
            />
          </div>
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
            <label>Investment amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="invoice-meta-row">
          <div className="field">
            <label>Founder name</label>
            <input type="text" value={founderName} onChange={(e) => setFounderName(e.target.value)} />
          </div>
          <div className="field">
            <label>Founder email</label>
            <input type="email" value={founderEmail} onChange={(e) => setFounderEmail(e.target.value)} />
          </div>
          <div />
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Deal terms, how this came about, follow-ups — anything worth remembering."
          />
        </div>
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
        {venture.status !== 'published' && (
          <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handlePublish} disabled={pending}>
            Publish
          </button>
        )}
        {venture.status === 'published' && (
          <>
            <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handleUnpublish} disabled={pending}>
              Unpublish
            </button>
            <Link href={`/ventures/${venture.slug}`} className="btn btn-ghost" style={{ width: 'auto' }} target="_blank">
              View live
            </Link>
          </>
        )}
        {venture.status !== 'archived' && (
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
