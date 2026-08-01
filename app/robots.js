const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://build-isago.vercel.app';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/store', '/academy', '/marketplace', '/ventures'],
        disallow: ['/dashboard', '/api', '/login', '/signup', '/forgot-password', '/reset-password', '/mfa-challenge'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
