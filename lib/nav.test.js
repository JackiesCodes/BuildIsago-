import { describe, expect, it } from 'vitest';
import { activeNavHref } from './nav';

const CLIENT = {
  hrefs: [
    '/dashboard/client/projects',
    '/dashboard/marketplace',
    '/dashboard/academy',
    '/dashboard/ventures',
    '/dashboard/downloads',
  ],
  projectBase: '/dashboard/client',
  projectsHref: '/dashboard/client/projects',
};

const STUDIO = {
  hrefs: [
    '/dashboard/studio',
    '/dashboard/studio/products',
    '/dashboard/studio/academy',
    '/dashboard/downloads',
  ],
  projectBase: '/dashboard/studio',
  projectsHref: '/dashboard/studio',
};

describe('activeNavHref', () => {
  it('highlights the section you are on', () => {
    expect(activeNavHref({ ...CLIENT, pathname: '/dashboard/client/projects' })).toBe(
      '/dashboard/client/projects'
    );
  });

  it('highlights Projects while inside an individual project', () => {
    // The whole reason this helper exists: a project lives at
    // /dashboard/client/<id>, which is not under the section's path.
    expect(
      activeNavHref({ ...CLIENT, pathname: '/dashboard/client/8f2c-1234/invoices' })
    ).toBe('/dashboard/client/projects');
  });

  it('highlights nothing on the home page', () => {
    // Home is reached from the logo, not from a nav item.
    expect(activeNavHref({ ...CLIENT, pathname: '/dashboard/client' })).toBeUndefined();
  });

  it('prefers the longest match so nested sections do not both light up', () => {
    expect(activeNavHref({ ...STUDIO, pathname: '/dashboard/studio/products' })).toBe(
      '/dashboard/studio/products'
    );
  });

  it('keeps the studio pipeline highlighted inside a studio project', () => {
    expect(activeNavHref({ ...STUDIO, pathname: '/dashboard/studio/8f2c-1234' })).toBe(
      '/dashboard/studio'
    );
  });

  it('does not treat a sibling path as a match', () => {
    // /dashboard/clients would otherwise pass a naive startsWith check.
    expect(activeNavHref({ ...CLIENT, pathname: '/dashboard/clientele' })).toBeUndefined();
  });

  it('returns undefined rather than throwing on an unknown path', () => {
    expect(activeNavHref({ ...CLIENT, pathname: '/dashboard/settings' })).toBeUndefined();
  });
});
