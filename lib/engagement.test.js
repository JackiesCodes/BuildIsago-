import { describe, expect, it } from 'vitest';
import { isSelfServe } from './engagement';

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
