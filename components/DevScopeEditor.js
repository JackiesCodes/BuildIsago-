'use client';

import { useState, useTransition } from 'react';
import { updateDevScope, generateDevScopeDraft } from '@/lib/actions/devScope';
import { IconPlus, IconSparkles, IconTrash } from './icons';

function StringListEditor({ items, onChange, placeholder, label }) {
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
            placeholder={placeholder}
            className="ghost-input"
            aria-label={label ? `${label} ${i + 1}` : undefined}
          />
          <button type="button" className="scope-remove" onClick={() => removeItem(i)} aria-label="Remove">
            <IconTrash />
          </button>
        </div>
      ))}
      <button type="button" className="scope-add" onClick={addItem}>
        <IconPlus /> Add
      </button>
    </div>
  );
}

function PairListEditor({ items, onChange, fieldA, fieldB, placeholderA, placeholderB, numbered }) {
  function updateItem(i, field, value) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    onChange([...items, { [fieldA]: '', [fieldB]: '' }]);
  }
  function removeItem(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  return (
    <div className="scope-list">
      {items.map((item, i) => (
        <div className="scope-row scope-row-pair" key={i}>
          {numbered ? (
            <span className="scope-step" aria-hidden="true">{i + 1}</span>
          ) : (
            <span className="scope-bullet" aria-hidden="true" />
          )}
          <div className="scope-pair-fields">
            <input
              type="text"
              value={item[fieldA] || ''}
              onChange={(e) => updateItem(i, fieldA, e.target.value)}
              placeholder={placeholderA}
              className="ghost-input scope-pair-a"
              aria-label={placeholderA}
            />
            <input
              type="text"
              value={item[fieldB] || ''}
              onChange={(e) => updateItem(i, fieldB, e.target.value)}
              placeholder={placeholderB}
              className="ghost-input scope-pair-b"
              aria-label={placeholderB}
            />
          </div>
          <button type="button" className="scope-remove" onClick={() => removeItem(i)} aria-label="Remove">
            <IconTrash />
          </button>
        </div>
      ))}
      <button type="button" className="scope-add" onClick={addItem}>
        <IconPlus /> Add
      </button>
    </div>
  );
}

export default function DevScopeEditor({ devScope }) {
  const [features, setFeatures] = useState(devScope.features || []);
  const [techStack, setTechStack] = useState(devScope.tech_stack || []);
  const [phases, setPhases] = useState(devScope.phases || []);
  const [risks, setRisks] = useState(devScope.risks || []);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(devScope.updated_at);
  const [generating, startGenerating] = useTransition();
  const [error, setError] = useState(null);

  function handleGenerate() {
    setError(null);
    startGenerating(async () => {
      const result = await generateDevScopeDraft(devScope.project_id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setFeatures(result.features);
      setTechStack(result.techStack);
      setPhases(result.phases);
      setRisks(result.risks);
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateDevScope(devScope.id, devScope.project_id, {
      features,
      techStack,
      phases,
      risks,
    });
    setSaving(false);
    if (result?.error) setError(result.error);
    else setSavedAt(new Date().toISOString());
  }

  return (
    <div>
      <div className="brand-section-head">
        <h3>Technical Scope</h3>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleGenerate}
          disabled={generating}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconSparkles /> {generating ? 'Generating…' : 'Generate with AI'}
        </button>
      </div>

      <div className="devscope-section">
        <h4>Features</h4>
        <StringListEditor
          items={features}
          onChange={setFeatures}
          placeholder="e.g. Users can reset their password via email"
          label="Feature"
        />
      </div>

      <div className="devscope-section">
        <h4>Tech stack</h4>
        <PairListEditor
          items={techStack}
          onChange={setTechStack}
          fieldA="name"
          fieldB="rationale"
          placeholderA="Technology"
          placeholderB="Why"
        />
      </div>

      <div className="devscope-section">
        <h4>Build phases</h4>
        <PairListEditor
          items={phases}
          onChange={setPhases}
          fieldA="title"
          fieldB="description"
          placeholderA="Phase"
          placeholderB="What happens"
          numbered
        />
      </div>

      <div className="devscope-section" style={{ marginBottom: 0 }}>
        <h4>Risks &amp; open questions</h4>
        <StringListEditor
          items={risks}
          onChange={setRisks}
          placeholder="e.g. Needs a decision on hosting region"
          label="Risk"
        />
      </div>

      {error && <div className="form-error" style={{ marginTop: 16 }}>{error}</div>}

      <div className="brand-footer-actions" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save scope'}
        </button>
        <span className="design-save-status">
          {savedAt ? `Saved ${new Date(savedAt).toLocaleString()}` : 'Not saved yet'}
        </span>
      </div>
    </div>
  );
}
