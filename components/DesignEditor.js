'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { updateDesignCanvas } from '@/lib/actions/designs';
import { IconCircle, IconDownload, IconImage, IconSquare, IconTrash, IconType } from './icons';

const FONT_FAMILIES = ['Inter', 'Space Grotesk', 'JetBrains Mono', 'Georgia', 'Arial'];

export default function DesignEditor({ design, backHref }) {
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const fabricModuleRef = useRef(null);

  const [title, setTitle] = useState(design.title);
  const [selection, setSelection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(design.updated_at);
  const [error, setError] = useState(null);

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
        canvas.requestRenderAll();
      }

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

      canvas.on('selection:created', syncSelection);
      canvas.on('selection:updated', syncSelection);
      canvas.on('selection:cleared', () => setSelection(null));
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

  const addImage = useCallback(
    (file) => {
      const fabric = fabricModuleRef.current;
      const canvas = fabricRef.current;
      if (!fabric || !canvas || !file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const img = await fabric.FabricImage.fromURL(reader.result);
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
      };
      reader.readAsDataURL(file);
    },
    [design.width, design.height]
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
        </div>

        <div className="design-toolbar-right">
          {error && <span className="design-save-error">{error}</span>}
          <span className="design-save-status">
            {saving ? 'Saving…' : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : 'Not saved yet'}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleSave} disabled={saving}>
            Save
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
        <div className="design-canvas-wrap">
          <canvas ref={canvasElRef} width={design.width} height={design.height} />
        </div>

        {selection && (
          <aside className="design-properties">
            <h4>Properties</h4>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Fill color</label>
              <input type="color" value={selection.fill} onChange={(e) => updateFill(e.target.value)} />
            </div>
            {isText && (
              <>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label>Font</label>
                  <select value={selection.fontFamily} onChange={(e) => updateFontFamily(e.target.value)}>
                    {FONT_FAMILIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Size</label>
                  <input
                    type="number"
                    min={8}
                    max={200}
                    value={selection.fontSize}
                    onChange={(e) => updateFontSize(Number(e.target.value))}
                  />
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
