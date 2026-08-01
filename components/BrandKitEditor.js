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

  const primary = colors[0]?.hex || '#0b8b9e';
  const secondary = colors[1]?.hex || '#0c1b21';

  return (
    <div>
      {/* The kit composed as a thing, not a set of fields — every edit
          below lands here, so you can judge the brand instead of
          imagining it from a form. */}
      <div className="brand-board" style={{ background: secondary }}>
        <div className="brand-board-body">
          <p className="brand-board-tagline" style={{ fontFamily: `'${headingFont}', sans-serif`, color: primary }}>
            {tagline || 'Your tagline appears here'}
          </p>
          <p className="brand-board-copy" style={{ fontFamily: `'${bodyFont}', sans-serif` }}>
            {voiceTone || 'Set a voice and tone below to see how the brand reads in a sentence.'}
          </p>
        </div>
        <div className="brand-board-ramp" aria-hidden="true">
          {(colors.length ? colors : [{ hex: '#0b8b9e' }, { hex: '#6ff0ea' }]).map((c, i) => (
            <span key={i} style={{ background: c.hex }} />
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="brand-section-head">
          <h3>Colors</h3>
          <span className="section-count">{colors.length} {colors.length === 1 ? 'color' : 'colors'}</span>
        </div>
        <div className="swatch-grid">
          {colors.map((c, i) => {
            const vsWhite = contrastGrade(contrastRatio(c.hex, '#ffffff'));
            const vsBlack = contrastGrade(contrastRatio(c.hex, '#000000'));
            return (
              <div className="swatch-card" key={i}>
                <div className="swatch-well" style={{ background: c.hex }}>
                  <input
                    type="color"
                    value={c.hex}
                    onChange={(e) => updateColor(i, 'hex', e.target.value)}
                    aria-label={`${c.name || 'Color'} value`}
                  />
                  {/* Legibility read-out sits on the color itself — the pair
                      it describes is right there, so you judge it in context
                      instead of mapping a row of mono text back to a chip. */}
                  <div className="swatch-contrast">
                    <span className={vsWhite.pass ? 'is-pass' : 'is-fail'} title={`Against white: ${vsWhite.label}`}>
                      <span className="swatch-contrast-chip" style={{ background: '#fff', color: c.hex }}>A</span>
                      {vsWhite.label}
                    </span>
                    <span className={vsBlack.pass ? 'is-pass' : 'is-fail'} title={`Against black: ${vsBlack.label}`}>
                      <span className="swatch-contrast-chip" style={{ background: '#000', color: c.hex }}>A</span>
                      {vsBlack.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="swatch-remove"
                    onClick={() => removeColor(i)}
                    aria-label={`Remove ${c.name || 'color'}`}
                  >
                    <IconTrash />
                  </button>
                </div>
                <div className="swatch-meta">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateColor(i, 'name', e.target.value)}
                    placeholder="Color name"
                    aria-label="Color name"
                    className="ghost-input swatch-name"
                  />
                  <input
                    type="text"
                    value={c.hex}
                    onChange={(e) => updateColor(i, 'hex', e.target.value)}
                    aria-label="Hex value"
                    className="ghost-input swatch-hex"
                    spellCheck={false}
                  />
                </div>
              </div>
            );
          })}
          <button type="button" className="swatch-add" onClick={addColor}>
            <IconPlus />
            <span>Add color</span>
          </button>
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
