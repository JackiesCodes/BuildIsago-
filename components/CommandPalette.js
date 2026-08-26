'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NAV, SETTINGS_ITEM } from '@/lib/constants/nav';
import { IconLogOut, IconPlus, IconSearch } from './icons';

export default function CommandPalette({ role, signOutAction }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const commands = useMemo(() => {
    const navCommands = (NAV[role] || NAV.client).map((item) => ({
      id: item.href,
      label: item.label,
      icon: item.icon,
      action: () => router.push(item.href),
    }));

    const extra = [];
    if (role === 'client') {
      extra.push({
        id: 'new-project',
        label: 'New Project',
        icon: IconPlus,
        action: () => router.push('/dashboard/client'),
      });
    }
    extra.push({
      id: SETTINGS_ITEM.href,
      label: SETTINGS_ITEM.label,
      icon: SETTINGS_ITEM.icon,
      action: () => router.push(SETTINGS_ITEM.href),
    });
    extra.push({
      id: 'sign-out',
      label: 'Sign out',
      icon: IconLogOut,
      action: () => signOutAction(),
    });

    return [...navCommands, ...extra];
  }, [role, router, signOutAction]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActiveIndex(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function runCommand(cmd) {
    setOpen(false);
    cmd.action();
  }

  function onInputKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) runCommand(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div className="command-overlay" onClick={() => setOpen(false)}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="command-search">
          <IconSearch />
          <input
            ref={inputRef}
            type="text"
            placeholder="Jump to a page or action…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            aria-label="Search commands"
            aria-controls="command-list"
            aria-activedescendant={filtered[activeIndex] ? `command-${filtered[activeIndex].id}` : undefined}
          />
          <button type="button" className="command-close" onClick={() => setOpen(false)} aria-label="Close">
            Esc
          </button>
        </div>
        <ul className="command-list" id="command-list" role="listbox">
          {!filtered.length && <li className="command-empty">No matches</li>}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <li key={cmd.id} id={`command-${cmd.id}`} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  className={i === activeIndex ? 'active' : ''}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => runCommand(cmd)}
                >
                  <Icon />
                  <span>{cmd.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
