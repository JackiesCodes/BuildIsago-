import { describe, expect, it } from 'vitest';
import { SERVICES, SERVICE_MAP, serviceLabel, serviceTool } from './services';

describe('SERVICES', () => {
  it('offers exactly the five services the marketing site sells', () => {
    expect(SERVICES.map((s) => s.label)).toEqual([
      'Software Development',
      'Branding',
      'Graphic Design',
      'Product Design',
      'Creative Media',
    ]);
  });

  it('gives every service a tool to open', () => {
    // A card with no tool is a dead end, which is the one thing a
    // self-service portal cannot have.
    for (const s of SERVICES) {
      expect(s.tool, s.value).toBeTruthy();
    }
  });

  it('no longer offers the retired Full Build', () => {
    expect(SERVICES.map((s) => s.value)).not.toContain('multiple');
  });
});

describe('serviceLabel', () => {
  it('names the five services', () => {
    expect(serviceLabel('product')).toBe('Product Design');
    expect(serviceLabel('media')).toBe('Creative Media');
  });

  it('still names retired services on existing projects', () => {
    // There are live rows with service_type='multiple'. Dropping it from
    // the map would render the raw column value to the client.
    expect(serviceLabel('multiple')).toBe('Full Build');
    expect(SERVICE_MAP.multiple).toBeDefined();
  });

  it('falls back to the raw value rather than rendering nothing', () => {
    expect(serviceLabel('something-new')).toBe('something-new');
  });
});

describe('serviceTool', () => {
  it('routes each service to its tool', () => {
    expect(serviceTool('software')).toBe('dev');
    expect(serviceTool('branding')).toBe('brand');
    expect(serviceTool('design')).toBe('designs');
    expect(serviceTool('product')).toBe('designs');
    expect(serviceTool('media')).toBe('designs');
  });

  it('routes retired and unknown services somewhere real', () => {
    // This value builds a URL, so returning undefined would send someone
    // to /dashboard/client/<id>/undefined.
    expect(serviceTool('multiple')).toBe('designs');
    expect(serviceTool('something-new')).toBe('designs');
    expect(serviceTool(undefined)).toBe('designs');
  });
});
