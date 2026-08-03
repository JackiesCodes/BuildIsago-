import { describe, expect, it } from 'vitest';
import { isSelfServe, showManagedSection } from './engagement';

describe('isSelfServe', () => {
  it('is true only for a non-studio account explicitly set to self_serve', () => {
    expect(isSelfServe({ role: 'client', engagement_mode: 'self_serve' })).toBe(true);
    expect(isSelfServe({ role: 'talent', engagement_mode: 'self_serve' })).toBe(true);
  });

  it('is false for managed accounts', () => {
    expect(isSelfServe({ role: 'client', engagement_mode: 'managed' })).toBe(false);
  });

  it('never applies to studio staff, whatever their mode says', () => {
    expect(isSelfServe({ role: 'studio', engagement_mode: 'self_serve' })).toBe(false);
  });

  it('defaults to managed when the mode is missing or the profile is absent', () => {
    // Guards the migration default: an account that predates the column
    // must keep seeing everything.
    expect(isSelfServe({ role: 'client' })).toBe(false);
    expect(isSelfServe(null)).toBe(false);
    expect(isSelfServe(undefined)).toBe(false);
  });
});

describe('showManagedSection', () => {
  it('shows everything to managed accounts regardless of content', () => {
    expect(showManagedSection(false, 0)).toBe(true);
    expect(showManagedSection(false, null)).toBe(true);
  });

  it('hides empty collaboration sections from self-serve accounts', () => {
    expect(showManagedSection(true, 0)).toBe(false);
    expect(showManagedSection(true, null)).toBe(false);
    expect(showManagedSection(true, undefined)).toBe(false);
    expect(showManagedSection(true, '')).toBe(false);
  });

  it('still shows a section to self-serve accounts once it has content', () => {
    // The safety net: correspondence, files or a bill the studio has
    // already sent must never disappear behind a preference.
    expect(showManagedSection(true, 1)).toBe(true);
    expect(showManagedSection(true, 12)).toBe(true);
    expect(showManagedSection(true, 'a brief')).toBe(true);
  });
});
