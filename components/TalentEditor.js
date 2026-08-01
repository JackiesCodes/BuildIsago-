'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateTalent, setTalentStatus, setTalentVisibility, deleteTalent } from '@/lib/actions/talent';
import { TALENT_DISCIPLINES, RATE_UNITS } from '@/lib/constants/talentDisciplines';
import { CURRENCIES } from '@/lib/constants/currencies';
import { IconPlus, IconTrash } from './icons';
import TalentStatusBadge from './TalentStatusBadge';
import TalentRequestsList from './TalentRequestsList';

function SpecialtiesEditor({ items, onChange }) {
  function updateItem(i, value) {
    onChange(items.map((it, idx) => (idx === i ? value : it)));
  }
  function addItem() {
    onChange([...items, '']);
  }
  function removeItem(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  return (
    <div className="scope-list">
      {items.map((item, i) => (
        <div className="scope-row" key={i}>
          <span className="scope-bullet" aria-hidden="true" />
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder="e.g. UI Design, React, Motion Graphics"
            className="ghost-input"
            aria-label={`Specialty ${i + 1}`}
          />
          <button type="button" className="scope-remove" onClick={() => removeItem(i)} aria-label="Remove">
            <IconTrash />
          </button>
        </div>
      ))}
      <button type="button" className="scope-add" onClick={addItem}>
        <IconPlus /> Add specialty
      </button>
    </div>
  );
}

export default function TalentEditor({ talent, requests }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(talent.full_name || '');
  const [discipline, setDiscipline] = useState(talent.discipline || 'designer');
  const [specialties, setSpecialties] = useState(talent.specialties?.length ? talent.specialties : []);
  const [bio, setBio] = useState(talent.bio || '');
  const [email, setEmail] = useState(talent.email || '');
  const [phone, setPhone] = useState(talent.phone || '');
  const [rate, setRate] = useState(talent.rate ?? '');
  const [rateCurrency, setRateCurrency] = useState(talent.rate_currency || 'usd');
  const [rateUnit, setRateUnit] = useState(talent.rate_unit || 'hourly');
  const [portfolioUrl, setPortfolioUrl] = useState(talent.portfolio_url || '');
  const [notes, setNotes] = useState(talent.notes || '');

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(talent.updated_at);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateTalent(talent.id, {
      fullName,
      discipline,
      specialties: specialties.filter((s) => s.trim()),
      email,
      phone,
      rate,
      rateCurrency,
      rateUnit,
      portfolioUrl,
      notes,
      bio,
    });
    setSaving(false);
    if (result?.error) setError(result.error);
    else setSavedAt(new Date().toISOString());
  }

  function handleToggleStatus() {
    const next = talent.status === 'active' ? 'inactive' : 'active';
    setError(null);
    startTransition(async () => {
      const result = await setTalentStatus(talent.id, next);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleToggleVisibility() {
    const next = talent.visibility === 'public' ? 'private' : 'public';
    setError(null);
    startTransition(async () => {
      const result = await setTalentVisibility(talent.id, next);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('Remove this person from the roster? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTalent(talent.id);
      if (result?.error) setError(result.error);
      else router.push('/dashboard/studio/talent');
    });
  }

  return (
    <div className="card">
      <div className="brand-section-head">
        <h3>{fullName || 'New Talent'}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {talent.profile_id && <span className="status-badge invoice-status-sent">Self-registered</span>}
          {talent.profile_id && (
            <span className={`status-badge talent-status-${talent.visibility === 'public' ? 'active' : 'inactive'}`}>
              {talent.visibility === 'public' ? 'Listed publicly' : 'Private'}
            </span>
          )}
          <TalentStatusBadge status={talent.status} />
        </div>
      </div>

      <div className="invoice-meta-row">
        <div className="field">
          <label>Full name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jordan Reeves" />
        </div>
        <div className="field">
          <label>Discipline</label>
          <select value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
            {TALENT_DISCIPLINES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Portfolio URL</label>
          <input type="text" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://…" />
        </div>
      </div>

      <div className="invoice-meta-row">
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div />
      </div>

      <div className="invoice-meta-row">
        <div className="field">
          <label>Rate currency</label>
          <select value={rateCurrency} onChange={(e) => setRateCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Rate</label>
          <input type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Optional" />
        </div>
        <div className="field">
          <label>Billed</label>
          <select value={rateUnit} onChange={(e) => setRateUnit(e.target.value)}>
            {RATE_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="devscope-section">
        <h4>Specialties</h4>
        <SpecialtiesEditor items={specialties} onChange={setSpecialties} />
      </div>

      <div className="field">
        <label>Bio (public, only shown if listed publicly)</label>
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>

      <div className="field" style={{ marginTop: 4 }}>
        <label>Notes (private, studio only)</label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How you know them, past work together, availability, anything worth remembering."
        />
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
        <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handleToggleStatus} disabled={pending}>
          {talent.status === 'active' ? 'Mark inactive' : 'Mark active'}
        </button>
        <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handleToggleVisibility} disabled={pending}>
          {talent.visibility === 'public' ? 'Make private' : 'List publicly'}
        </button>
        <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={pending}>
          Remove
        </button>
        <span className="design-save-status">
          {savedAt ? `Saved ${new Date(savedAt).toLocaleString()}` : 'Not saved yet'}
        </span>
      </div>

      {requests !== undefined && (
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 14 }}>Inquiries</h4>
          <TalentRequestsList requests={requests} />
        </div>
      )}
    </div>
  );
}
