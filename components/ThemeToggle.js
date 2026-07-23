'use client';

import { useEffect, useState } from 'react';
import { IconMoon, IconSun } from './icons';
import { applyPreference, THEME_EVENT } from '@/lib/theme';

export default function ThemeToggle() {
  const [effective, setEffective] = useState(null);

  useEffect(() => {
    setEffective(document.documentElement.getAttribute('data-theme') || 'dark');
    function onChange(e) {
      setEffective(e.detail.effective);
    }
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  function toggle() {
    applyPreference(effective === 'light' ? 'dark' : 'light');
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={effective === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={effective === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {effective === null ? null : effective === 'light' ? <IconMoon /> : <IconSun />}
    </button>
  );
}
