import { describe, it, expect } from 'vitest';
import { toEmbedUrl } from './videoEmbed';

describe('toEmbedUrl', () => {
  it('converts a standard YouTube watch URL', () => {
    expect(toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    );
  });

  it('converts a youtu.be short link', () => {
    expect(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('converts a YouTube Shorts link', () => {
    expect(toEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    );
  });

  it('converts a Vimeo URL', () => {
    expect(toEmbedUrl('https://vimeo.com/76979871')).toBe('https://player.vimeo.com/video/76979871');
  });

  it('returns null for an unrecognized host (e.g. Loom)', () => {
    expect(toEmbedUrl('https://www.loom.com/share/abc123')).toBeNull();
  });

  it('returns null for a malformed URL instead of throwing', () => {
    expect(toEmbedUrl('not a url')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(toEmbedUrl('')).toBeNull();
    expect(toEmbedUrl(null)).toBeNull();
  });
});
