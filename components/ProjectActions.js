'use client';

import { useEffect, useRef, useState } from 'react';
import { deleteProject, renameProject } from '@/lib/actions/projects';
import { IconChevronDown, IconTrash } from './icons';

export default function ProjectActions({ projectId, title }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setValue(title);
  }, [title]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function submitRename(e) {
    e.preventDefault();
    const next = value.trim();
    if (!next || next === title) {
      setRenaming(false);
      setValue(title);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await renameProject(projectId, next);
    setBusy(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setRenaming(false);
    setOpen(false);
  }

  async function handleDelete() {
    // Irreversible and takes the conversation, files and designs with
    // it, so it asks for the name rather than a yes/no nobody reads.
    const typed = window.prompt(
      `Deleting "${title}" also removes its messages, files, designs and brand kit. This cannot be undone.\n\nType the project name to confirm:`
    );
    if (typed === null) return;
    if (typed.trim() !== title.trim()) {
      setError("That name didn't match — nothing was deleted.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await deleteProject(projectId);
    // On success this redirects and never returns.
    setBusy(false);
    if (result?.error) setError(result.error);
  }

  if (renaming) {
    return (
      <form className="project-rename" onSubmit={submitRename}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Project name"
          maxLength={120}
          disabled={busy}
          autoFocus
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setRenaming(false);
            setValue(title);
            setError(null);
          }}
          disabled={busy}
        >
          Cancel
        </button>
        {error && <span className="project-actions-error">{error}</span>}
      </form>
    );
  }

  return (
    <div className="project-actions" ref={wrapRef}>
      <button
        type="button"
        className="project-actions-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
      >
        Project
        <IconChevronDown />
      </button>

      {open && (
        <div className="project-actions-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setRenaming(true);
              setOpen(false);
            }}
          >
            Rename
          </button>
          <button type="button" role="menuitem" className="is-danger" onClick={handleDelete} disabled={busy}>
            <IconTrash />
            {busy ? 'Deleting…' : 'Delete project'}
          </button>
        </div>
      )}

      {error && <span className="project-actions-error">{error}</span>}
    </div>
  );
}
