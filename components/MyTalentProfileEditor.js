'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateMyTalentProfile, setMyTalentVisibility } from '@/lib/actions/marketplace';
import { TALENT_DISCIPLINES, RATE_UNITS } from '@/lib/constants/talentDisciplines';
import { CURRENCIES } from '@/lib/constants/currencies';
import { IconPlus, IconTrash } from './icons';

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

export default function MyTalentProfileEditor({ talent }) {
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

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(talent.updated_at);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateMyTalentProfile(talent.id, {
      fullName,
      discipline,
      specialties: specialties.filter((s) => s.trim()),
      bio,
      email,
      phone,
      rate,
      rateCurrency,
      rateUnit,
      portfolioUrl,
    });
    setSaving(false);
    if (result?.error) setError(result.error);
    else setSavedAt(new Date().toISOString());
  }

  function handleToggleVisibility() {
    const next = talent.visibility === 'public' ? 'private' : 'public';
    setError(null);
    startTransition(async () => {
      const result = await setMyTalentVisibility(talent.id, next);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="card">
      <div className="brand-section-head">
        <h3>{fullName || 'Your profile'}</h3>
        <span className={`status-badge talent-status-${talent.visibility === 'public' ? 'active' : 'inactive'}`}>
          {talent.visibility === 'public' ? 'Listed publicly' : 'Private'}
        </span>
      </div>

      <p className="field-hint" style={{ marginBottom: 20 }}>
        {talent.visibility === 'public'
          ? 'Your profile is visible on the public marketplace and clients can send you inquiries.'
          : 'Your profile is private — nobody can find or contact you until you list it publicly.'}
      </p>

      <div className="invoice-meta-row">
        <div className="field">
          <label>Full name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
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

      <div className="field">
        <label>Bio (shown on your public profile)</label>
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A couple of sentences about what you do and who you work best with." />
      </div>

      <div className="invoice-meta-row">
        <div className="field">
          <label>Contact email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Phone (optional)</label>
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

      <div className="devscope-section" style={{ marginBottom: 0 }}>
        <h4>Specialties</h4>
        <SpecialtiesEditor items={specialties} onChange={setSpecialties} />
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
        <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={handleToggleVisibility} disabled={pending}>
          {talent.visibility === 'public' ? 'Make private' : 'List publicly'}
        </button>
        <span className="design-save-status">
          {savedAt ? `Saved ${new Date(savedAt).toLocaleString()}` : 'Not saved yet'}
        </span>
      </div>
    </div>
  );
}
