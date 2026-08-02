'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IconLogOut, IconMoon, IconSettings, IconSun } from './icons';
import { applyPreference, getPreference, THEME_EVENT } from '@/lib/theme';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function ProfileMenu({ name, email, role, signOutAction }) {
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState(null);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);

  const initial = (name || email || '?').trim().charAt(0).toUpperCase();

  useEffect(() => {
    setPref(getPreference());
    function onChange(e) {
      setPref(e.detail.pref);
    }
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  // Click-outside and Escape both close, and Escape returns focus to the
  // trigger so keyboard users aren't dropped at the top of the document.
  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="profile-menu" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="profile-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="sidebar-avatar">{initial}</span>
        <span className="profile-trigger-text">
          <span className="profile-trigger-name">{name || email}</span>
          <span className="profile-trigger-role">{role === 'studio' ? 'Studio account' : 'Client account'}</span>
        </span>
      </button>

      {open && (
        <div className="profile-popover" role="menu">
          <div className="profile-identity">
            <span className="profile-identity-name">{name || 'Your account'}</span>
            {email && <span className="profile-identity-email">{email}</span>}
          </div>

          <div className="profile-section">
            <span className="profile-section-label">Theme</span>
            <div className="theme-segmented" role="group" aria-label="Theme">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={pref === t.value ? 'active' : ''}
                  aria-pressed={pref === t.value}
                  onClick={() => applyPreference(t.value)}
                >
                  {t.value === 'light' && <IconSun />}
                  {t.value === 'dark' && <IconMoon />}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="profile-actions">
            <Link href="/dashboard/settings" className="profile-action" role="menuitem" onClick={() => setOpen(false)}>
              <IconSettings />
              <span>Settings</span>
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="profile-action profile-action-danger" role="menuitem">
                <IconLogOut />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
