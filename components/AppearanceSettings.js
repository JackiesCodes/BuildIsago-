'use client';

import { useEffect, useState } from 'react';
import { IconMoon, IconSettings, IconSun } from './icons';
import { applyPreference, getPreference, THEME_EVENT } from '@/lib/theme';

const OPTIONS = [
  { value: 'system', label: 'System', icon: IconSettings },
  { value: 'light', label: 'Light', icon: IconSun },
  { value: 'dark', label: 'Dark', icon: IconMoon },
];

export default function AppearanceSettings() {
  const [pref, setPref] = useState(null);

  useEffect(() => {
    setPref(getPreference());
    function onChange(e) {
      setPref(e.detail.pref);
    }
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  return (
    <div className="theme-picker">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          className={`theme-picker-option${pref === value ? ' active' : ''}`}
          onClick={() => applyPreference(value)}
        >
          <Icon />
          {label}
        </button>
      ))}
    </div>
  );
}
