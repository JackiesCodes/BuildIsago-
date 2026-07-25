'use client';

import { useState, useTransition } from 'react';
import { updateDevScope, generateDevScopeDraft } from '@/lib/actions/devScope';
import { IconPlus, IconSparkles, IconTrash } from './icons';

function StringListEditor({ items, onChange, placeholder }) {
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
    <div className="devscope-list">
      {items.map((item, i) => (
        <div className="devscope-list-row" key={i}>
          <input type="text" value={item} onChange={(e) => updateItem(i, e.target.value)} placeholder={placeholder} />
          <button type="button" onClick={() => removeItem(i)} aria-label="Remove">
            <IconTrash />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
        <IconPlus /> Add
      </button>
    </div>
  );
}

function PairListEditor({ items, onChange, fieldA, fieldB, placeholderA, placeholderB }) {
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
    <div className="devscope-list">
      {items.map((item, i) => (
        <div className="devscope-pair-row" key={i}>
          <input
            type="text"
            value={item[fieldA] || ''}
            onChange={(e) => updateItem(i, fieldA, e.target.value)}
            placeholder={placeholderA}
            className="devscope-pair-a"
          />
          <input
            type="text"
            value={item[fieldB] || ''}
            onChange={(e) => updateItem(i, fieldB, e.target.value)}
            placeholder={placeholderB}
            className="devscope-pair-b"
          />
          <button type="button" onClick={() => removeItem(i)} aria-label="Remove">
            <IconTrash />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
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
        <StringListEditor items={features} onChange={setFeatures} placeholder="e.g. Users can reset their password via email" />
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
        />
      </div>

      <div className="devscope-section" style={{ marginBottom: 0 }}>
        <h4>Risks &amp; open questions</h4>
        <StringListEditor items={risks} onChange={setRisks} placeholder="e.g. Needs a decision on hosting region" />
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
