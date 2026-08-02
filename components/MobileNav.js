'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV, SETTINGS_ITEM } from '@/lib/constants/nav';
import { IconLogOut, IconPlus, IconSettings } from './icons';
import { applyPreference, getPreference, THEME_EVENT } from '@/lib/theme';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function MobileNav({ role, name, email, homeHref, signOutAction }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState(null);

  const navItems = NAV[role] || NAV.client;
  const initial = (name || email || '?').trim().charAt(0).toUpperCase();

  const activeHref = navItems
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  useEffect(() => {
    setPref(getPreference());
    function onChange(e) {
      setPref(e.detail.pref);
    }
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  // Close on navigation — without this the drawer stays open over the
  // page you just asked for.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock the page behind the drawer and wire Escape to dismiss.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <header className="mobile-bar">
        <button
          type="button"
          className="mobile-bar-trigger"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <span className="hamburger" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>

        <Link href={homeHref} className="mobile-bar-brand">
          <img src="/logo-icon.png" alt="" />
          <span>Build<span className="accent">Isago</span></span>
        </Link>

        {role === 'client' && (
          <Link href="/dashboard/client/new" className="mobile-bar-cta" aria-label="New project">
            <IconPlus />
          </Link>
        )}
      </header>

      {open && (
        <div className="mobile-drawer-scrim" onClick={() => setOpen(false)}>
          <nav
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-drawer-head">
              <span className="sidebar-avatar">{initial}</span>
              <div className="mobile-drawer-identity">
                <span className="mobile-drawer-name">{name || email}</span>
                <span className="mobile-drawer-role">
                  {role === 'studio' ? 'Studio account' : 'Client account'}
                </span>
              </div>
              <button type="button" className="mobile-drawer-close" onClick={() => setOpen(false)} aria-label="Close menu">
                &times;
              </button>
            </div>

            <ul className="mobile-drawer-nav">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={item.href === activeHref ? 'active' : ''}>
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mobile-drawer-section">
              <span className="mobile-drawer-label">Theme</span>
              <div className="theme-segmented" role="group" aria-label="Theme">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={pref === t.value ? 'active' : ''}
                    aria-pressed={pref === t.value}
                    onClick={() => applyPreference(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mobile-drawer-foot">
              <Link href={SETTINGS_ITEM.href} className="profile-action">
                <IconSettings />
                <span>Settings</span>
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="profile-action profile-action-danger">
                  <IconLogOut />
                  <span>Sign out</span>
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
