'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IconSearch } from './icons';
import ThemeToggle from './ThemeToggle';

export default function TopBar({ homeHref, roleLabel }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef(null);
  const [value, setValue] = useState(pathname === homeHref ? searchParams.get('q') || '' : '');

  useEffect(() => {
    if (pathname === homeHref) setValue(searchParams.get('q') || '');
  }, [pathname, homeHref, searchParams]);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const current = pathname === homeHref ? searchParams.get('q') || '' : '';
      if (value === current) return;
      const target = value ? `${homeHref}?q=${encodeURIComponent(value)}` : homeHref;
      router.push(target);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="topbar">
      <label className="topbar-search">
        <IconSearch />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search your projects…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <kbd>⌘K</kbd>
      </label>
      <div className="topbar-actions">
        <ThemeToggle />
        {roleLabel && <span className="role-pill">{roleLabel}</span>}
      </div>
    </div>
  );
}
