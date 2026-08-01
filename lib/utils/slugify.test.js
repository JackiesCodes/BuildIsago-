import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Brand Design Fundamentals')).toBe('brand-design-fundamentals');
  });

  it('strips punctuation', () => {
    expect(slugify("Founder's Guide: Pt. 1!")).toBe('founder-s-guide-pt-1');
  });

  it('collapses repeated separators and trims leading/trailing hyphens', () => {
    expect(slugify('  --Too   Many---Spaces--  ')).toBe('too-many-spaces');
  });

  it('returns an empty string for empty or nullish input', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
  });

  it('truncates to 60 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBe(60);
  });
});
