'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { updateDesignCanvas } from '@/lib/actions/designs';
import { IconCircle, IconDownload, IconImage, IconSquare, IconTrash, IconType } from './icons';

const FONT_FAMILIES = ['Inter', 'Space Grotesk', 'JetBrains Mono', 'Georgia', 'Arial'];

const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2];

export default function DesignEditor({ design, backHref, references = [] }) {
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const fabricModuleRef = useRef(null);
  const wrapRef = useRef(null);
  // Once the user picks a zoom themselves we stop re-fitting under them
  // on resize — an editor that silently rescales your work is worse
  // than one that needs a click.
  const userZoomedRef = useRef(false);

  const [title, setTitle] = useState(design.title);
  const [selection, setSelection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(design.updated_at);
  const [error, setError] = useState(null);
  const [showReferences, setShowReferences] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isEmpty, setIsEmpty] = useState(true);
  const [ready, setReady] = useState(false);

  const computeFit = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return 1;
    const pad = 72;
    return Math.min(
      Math.max((wrap.clientWidth - pad) / design.width, 0.1),
      Math.max((wrap.clientHeight - pad) / design.height, 0.1),
      1
    );
  }, [design.width, design.height]);

  const fitToScreen = useCallback(() => {
    userZoomedRef.current = false;
    setZoom(computeFit());
  }, [computeFit]);

  // An artboard can easily be larger than the viewport (1080x1080 is the
  // default), so measure and fit on mount and on resize. Uses an
  // observer callback rather than a bare effect body so the initial
  // measurement happens after layout, with real dimensions.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const observer = new ResizeObserver(() => {
      if (!userZoomedRef.current) setZoom(computeFit());
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [computeFit]);

  // Fabric owns the canvas element's inline styles (it wraps it in its
  // own container), so zoom has to go through setDimensions rather than
  // a React style prop, which Fabric would overwrite. cssOnly keeps the
  // backing resolution at full size, so exports stay sharp at any zoom.
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !ready) return;
    canvas.setDimensions(
      { width: design.width * zoom, height: design.height * zoom },
      { cssOnly: true }
    );
  }, [zoom, ready, design.width, design.height]);

  function stepZoom(direction) {
    userZoomedRef.current = true;
    setZoom((current) => {
      const next =
        direction > 0
          ? ZOOM_STEPS.find((z) => z > current + 0.001)
          : [...ZOOM_STEPS].reverse().find((z) => z < current - 0.001);
      return next ?? current;
    });
  }

  useEffect(() => {
    let disposed = false;
    let canvas;

    (async () => {
      const fabric = await import('fabric');
      if (disposed) return;
      fabricModuleRef.current = fabric;

      canvas = new fabric.Canvas(canvasElRef.current, {
        width: design.width,
        height: design.height,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;

      if (design.canvas_json && Object.keys(design.canvas_json).length) {
        await canvas.loadFromJSON(design.canvas_json);
      }

      // A brand-new design never hit the branch above, so its white
      // backgroundColor was set but never painted and the artboard
      // rendered fully transparent on screen. (Export was unaffected —
      // Fabric's toDataURL re-renders into its own canvas.) Render
      // unconditionally, and only default the colour when the loaded
      // document didn't bring its own.
      if (!canvas.backgroundColor) canvas.backgroundColor = '#ffffff';
      canvas.requestRenderAll();

      const syncSelection = () => {
        const obj = canvas.getActiveObject();
        if (!obj) {
          setSelection(null);
          return;
        }
        setSelection({
          type: obj.type,
          fill: obj.fill || '#2cc6d3',
          fontFamily: obj.fontFamily || 'Inter',
          fontSize: obj.fontSize || 32,
        });
      };

      const syncEmpty = () => setIsEmpty(canvas.getObjects().length === 0);
      syncEmpty();
      setReady(true);

      canvas.on('selection:created', syncSelection);
      canvas.on('selection:updated', syncSelection);
      canvas.on('selection:cleared', () => setSelection(null));
      canvas.on('object:added', syncEmpty);
      canvas.on('object:removed', syncEmpty);
    })();

    return () => {
      disposed = true;
      if (canvas) canvas.dispose().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const obj = canvas.getActiveObject();
        if (!obj || obj.isEditing) return;
        e.preventDefault();
        canvas.remove(obj);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const addRect = useCallback(() => {
    const fabric = fabricModuleRef.current;
    const canvas = fabricRef.current;
    if (!fabric || !canvas) return;
    const rect = new fabric.Rect({
      left: design.width / 2 - 80,
      top: design.height / 2 - 60,
      width: 160,
      height: 120,
      fill: '#2cc6d3',
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
  }, [design.width, design.height]);

  const addCircle = useCallback(() => {
    const fabric = fabricModuleRef.current;
    const canvas = fabricRef.current;
    if (!fabric || !canvas) return;
    const circle = new fabric.Circle({
      left: design.width / 2 - 60,
      top: design.height / 2 - 60,
      radius: 60,
      fill: '#6ff0ea',
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.requestRenderAll();
  }, [design.width, design.height]);

  const addText = useCallback(() => {
    const fabric = fabricModuleRef.current;
    const canvas = fabricRef.current;
    if (!fabric || !canvas) return;
    const text = new fabric.IText('Edit this text', {
      left: design.width / 2 - 90,
      top: design.height / 2 - 20,
      fontFamily: 'Inter',
      fontSize: 32,
      fill: '#0c1b21',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
  }, [design.width, design.height]);

  const addImageFromSrc = useCallback(
    async (src, { crossOrigin } = {}) => {
      const fabric = fabricModuleRef.current;
      const canvas = fabricRef.current;
      if (!fabric || !canvas) return;
      const img = await fabric.FabricImage.fromURL(src, crossOrigin ? { crossOrigin } : undefined);
      const scale = Math.min((design.width * 0.6) / img.width, (design.height * 0.6) / img.height, 1);
      img.set({
        left: design.width / 2 - (img.width * scale) / 2,
        top: design.height / 2 - (img.height * scale) / 2,
        scaleX: scale,
        scaleY: scale,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    },
    [design.width, design.height]
  );

  const addImage = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => addImageFromSrc(reader.result);
      reader.readAsDataURL(file);
    },
    [addImageFromSrc]
  );

  const addReferenceImage = useCallback(
    (url) => {
      addImageFromSrc(url, { crossOrigin: 'anonymous' });
      setShowReferences(false);
    },
    [addImageFromSrc]
  );

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, []);

  const bringForward = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    canvas.bringObjectForward(obj);
    canvas.requestRenderAll();
  }, []);

  const sendBackward = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    canvas.sendObjectBackwards(obj);
    canvas.requestRenderAll();
  }, []);

  const updateFill = useCallback((color) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set('fill', color);
    canvas.requestRenderAll();
    setSelection((s) => (s ? { ...s, fill: color } : s));
  }, []);

  const updateFontFamily = useCallback((fontFamily) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set('fontFamily', fontFamily);
    canvas.requestRenderAll();
    setSelection((s) => (s ? { ...s, fontFamily } : s));
  }, []);

  const updateFontSize = useCallback((fontSize) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set('fontSize', fontSize);
    canvas.requestRenderAll();
    setSelection((s) => (s ? { ...s, fontSize } : s));
  }, []);

  async function handleSave() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setSaving(true);
    setError(null);
    const json = canvas.toJSON();
    const result = await updateDesignCanvas(design.id, design.project_id, json, title);
    setSaving(false);
    if (result?.error) setError(result.error);
    else setSavedAt(new Date().toISOString());
  }

  function handleExportPNG() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${title || 'design'}.png`;
    a.click();
  }

  async function handleExportPDF() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: design.width >= design.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [design.width, design.height],
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, design.width, design.height);
    pdf.save(`${title || 'design'}.pdf`);
  }

  const isText = selection?.type === 'i-text' || selection?.type === 'textbox';

  return (
    <div className="design-editor">
      <div className="design-toolbar">
        <Link href={backHref} className="design-back-link">
          &larr; Back
        </Link>

        <input
          className="design-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Design title"
        />

        <div className="design-toolbar-tools">
          <button type="button" onClick={addRect} title="Add rectangle" aria-label="Add rectangle">
            <IconSquare />
          </button>
          <button type="button" onClick={addCircle} title="Add circle" aria-label="Add circle">
            <IconCircle />
          </button>
          <button type="button" onClick={addText} title="Add text" aria-label="Add text">
            <IconType />
          </button>
          <label className="design-tool-upload" title="Add image">
            <IconImage />
            <input type="file" accept="image/*" onChange={(e) => addImage(e.target.files?.[0])} />
          </label>
          {references.length > 0 && (
            <div className="design-references-wrap">
              <button
                type="button"
                className="design-tool-text"
                onClick={() => setShowReferences((v) => !v)}
              >
                References
              </button>
              {showReferences && (
                <div className="design-references-dropdown">
                  {references.map((ref) => (
                    <button
                      type="button"
                      key={ref.id}
                      className="design-reference-thumb"
                      onClick={() => addReferenceImage(ref.url)}
                      title={`Insert ${ref.title}`}
                    >
                      <img src={ref.url} alt={ref.title} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <span className="design-toolbar-divider" />
          <button type="button" onClick={bringForward} disabled={!selection} className="design-tool-text">
            Forward
          </button>
          <button type="button" onClick={sendBackward} disabled={!selection} className="design-tool-text">
            Backward
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={!selection}
            title="Delete selected"
            aria-label="Delete selected"
          >
            <IconTrash />
          </button>

          <span className="design-toolbar-divider" />

          <div className="design-zoom">
            <button type="button" onClick={() => stepZoom(-1)} aria-label="Zoom out" title="Zoom out">
              &minus;
            </button>
            <span aria-live="polite">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => stepZoom(1)} aria-label="Zoom in" title="Zoom in">
              +
            </button>
            <button type="button" className="design-tool-text" onClick={fitToScreen}>
              Fit
            </button>
          </div>
        </div>

        <div className="design-toolbar-right">
          {error && <span className="design-save-error">{error}</span>}
          <span className="design-save-status">
            {saving ? 'Saving…' : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : 'Not saved yet'}
          </span>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleExportPNG}>
            <IconDownload /> PNG
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleExportPDF}>
            <IconDownload /> PDF
          </button>
        </div>
      </div>

      <div className="design-body">
        <div className="design-canvas-wrap" ref={wrapRef}>
          <div className="design-artboard">
            <canvas ref={canvasElRef} width={design.width} height={design.height} />
            {isEmpty && (
              <div className="design-empty-hint">
                <p>Blank artboard</p>
                <span>Add a shape, some text, or an image from the toolbar to start.</span>
              </div>
            )}
          </div>
        </div>

        {/* Rendered whether or not something is selected — a panel that
            appears on click would shift the artboard sideways mid-edit. */}
        <aside className="design-properties">
          <h4>Properties</h4>
          {selection ? (
            <>
              <div className="field" style={{ marginBottom: 14 }}>
                <label htmlFor="design-fill">Fill color</label>
                <input
                  id="design-fill"
                  type="color"
                  value={selection.fill}
                  onChange={(e) => updateFill(e.target.value)}
                />
              </div>
              {isText && (
                <>
                  <div className="field" style={{ marginBottom: 14 }}>
                    <label htmlFor="design-font">Font</label>
                    <select
                      id="design-font"
                      value={selection.fontFamily}
                      onChange={(e) => updateFontFamily(e.target.value)}
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="design-size">Size</label>
                    <input
                      id="design-size"
                      type="number"
                      min={8}
                      max={200}
                      value={selection.fontSize}
                      onChange={(e) => updateFontSize(Number(e.target.value))}
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="design-properties-empty">
              Select something on the artboard to edit its colour and type.
            </p>
          )}

          <div className="design-canvas-meta">
            <span>Artboard</span>
            <span>{design.width} × {design.height}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
