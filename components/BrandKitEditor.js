'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { updateBrandKit, generateBrandVoiceDraft } from '@/lib/actions/brandKit';
import { BRAND_FONTS, googleFontsHref } from '@/lib/constants/brandFonts';
import { contrastRatio, contrastGrade } from '@/lib/utils/contrast';
import { IconCopyLink, IconPlus, IconSparkles, IconTrash } from './icons';

export default function BrandKitEditor({ brandKit, shareUrl }) {
  const [colors, setColors] = useState(brandKit.colors?.length ? brandKit.colors : []);
  const [headingFont, setHeadingFont] = useState(brandKit.heading_font);
  const [bodyFont, setBodyFont] = useState(brandKit.body_font);
  const [tagline, setTagline] = useState(brandKit.tagline || '');
  const [voiceTone, setVoiceTone] = useState(brandKit.voice_tone || '');
  const [taglineSuggestions, setTaglineSuggestions] = useState([]);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(brandKit.updated_at);
  const [generating, startGenerating] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const fontLinkRef = useRef(null);

  useEffect(() => {
    const href = googleFontsHref([headingFont, bodyFont]);
    if (!href) return;
    if (!fontLinkRef.current) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      fontLinkRef.current = link;
    }
    fontLinkRef.current.href = href;
  }, [headingFont, bodyFont]);

  useEffect(
    () => () => {
      if (fontLinkRef.current) fontLinkRef.current.remove();
    },
    []
  );

  function updateColor(index, field, value) {
    setColors((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  function addColor() {
    setColors((prev) => [...prev, { name: `Color ${prev.length + 1}`, hex: '#2cc6d3' }]);
  }

  function removeColor(index) {
    setColors((prev) => prev.filter((_, i) => i !== index));
  }

  function handleGenerate() {
    setError(null);
    startGenerating(async () => {
      const result = await generateBrandVoiceDraft(brandKit.project_id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setTaglineSuggestions(result.taglines);
      setVoiceTone(result.voiceTone);
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateBrandKit(brandKit.id, brandKit.project_id, {
      colors,
      headingFont,
      bodyFont,
      tagline,
      voiceTone,
    });
    setSaving(false);
    if (result?.error) setError(result.error);
    else setSavedAt(new Date().toISOString());
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy the link — copy it manually from the address bar.');
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="brand-section-head">
          <h3>Colors</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addColor}>
            <IconPlus /> Add color
          </button>
        </div>
        <div className="brand-colors-grid">
          {colors.map((c, i) => {
            const vsWhite = contrastGrade(contrastRatio(c.hex, '#ffffff'));
            const vsBlack = contrastGrade(contrastRatio(c.hex, '#000000'));
            return (
              <div className="brand-color-row" key={i}>
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => updateColor(i, 'hex', e.target.value)}
                  className="brand-color-swatch"
                />
                <div className="brand-color-fields">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateColor(i, 'name', e.target.value)}
                    placeholder="Color name"
                  />
                  <input
                    type="text"
                    value={c.hex}
                    onChange={(e) => updateColor(i, 'hex', e.target.value)}
                    className="brand-color-hex"
                  />
                </div>
                <div className="brand-color-contrast">
                  <span className={vsWhite.pass ? 'contrast-pass' : 'contrast-fail'}>
                    vs white: {vsWhite.label}
                  </span>
                  <span className={vsBlack.pass ? 'contrast-pass' : 'contrast-fail'}>
                    vs black: {vsBlack.label}
                  </span>
                </div>
                <button
                  type="button"
                  className="brand-color-remove"
                  onClick={() => removeColor(i)}
                  aria-label={`Remove ${c.name}`}
                >
                  <IconTrash />
                </button>
              </div>
            );
          })}
          {!colors.length && <p style={{ color: 'var(--muted-2)', fontSize: '0.85rem' }}>No colors yet.</p>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Typography</h3>
        <div className="meta-form" style={{ marginBottom: 20 }}>
          <div className="meta-field">
            <label>Heading font</label>
            <select value={headingFont} onChange={(e) => setHeadingFont(e.target.value)}>
              {BRAND_FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="meta-field">
            <label>Body font</label>
            <select value={bodyFont} onChange={(e) => setBodyFont(e.target.value)}>
              {BRAND_FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="brand-font-preview">
          <p className="brand-font-preview-heading" style={{ fontFamily: `'${headingFont}', sans-serif` }}>
            The quick brown fox
          </p>
          <p className="brand-font-preview-body" style={{ fontFamily: `'${bodyFont}', sans-serif` }}>
            The quick brown fox jumps over the lazy dog. 0123456789 — a working preview of body copy
            set in {bodyFont}.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="brand-section-head">
          <h3>Voice &amp; tagline</h3>
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

        {taglineSuggestions.length > 0 && (
          <div className="brand-tagline-suggestions">
            {taglineSuggestions.map((t, i) => (
              <button type="button" key={i} className="brand-tagline-chip" onClick={() => setTagline(t)}>
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="field">
          <label htmlFor="tagline">Tagline</label>
          <input id="tagline" type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="voice-tone">Voice &amp; tone</label>
          <textarea id="voice-tone" rows={4} value={voiceTone} onChange={(e) => setVoiceTone(e.target.value)} />
        </div>
      </div>

      {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="brand-footer-actions">
        <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save brand kit'}
        </button>
        <span className="design-save-status">
          {savedAt ? `Saved ${new Date(savedAt).toLocaleString()}` : 'Not saved yet'}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleCopyLink} style={{ marginLeft: 'auto' }}>
          <IconCopyLink /> {copied ? 'Link copied!' : 'Copy public link'}
        </button>
      </div>
    </div>
  );
}
