'use client';

// Mirrors the theme logic in site/index.html's inline boot script — same
// cookie name/format so the preference is shared between the marketing
// site and the portal once both live on subdomains of buildisago.com.
// Until then the cookie is set host-only and each site just remembers
// its own choice, same as before.

export const THEME_COOKIE = 'bi-theme';
const SHARED_ROOT_DOMAIN = 'buildisago.com';
export const THEME_EVENT = 'buildisago:theme-change';

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function domainAttr() {
  const host = window.location.hostname;
  if (host === SHARED_ROOT_DOMAIN || host.endsWith(`.${SHARED_ROOT_DOMAIN}`)) {
    return `; domain=.${SHARED_ROOT_DOMAIN}`;
  }
  return '';
}

export function resolveEffective(pref) {
  if (pref === 'light' || pref === 'dark') return pref;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function getPreference() {
  const fromCookie = readCookie(THEME_COOKIE);
  if (fromCookie === 'light' || fromCookie === 'dark' || fromCookie === 'system') return fromCookie;
  try {
    const legacy = localStorage.getItem('theme');
    if (legacy === 'light' || legacy === 'dark') return legacy;
  } catch {
    // localStorage unavailable — fall through to system default
  }
  return 'system';
}

export function applyPreference(pref) {
  const effective = resolveEffective(pref);
  document.documentElement.setAttribute('data-theme', effective);
  document.documentElement.setAttribute('data-theme-pref', pref);
  try {
    document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax${domainAttr()}`;
    if (pref === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', pref);
  } catch {
    // storage unavailable (private browsing, etc.) — theme just won't persist
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { pref, effective } }));
}
