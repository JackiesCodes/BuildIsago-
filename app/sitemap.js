import { createClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://build-isago.vercel.app';

// Dynamic — pulls every published product/course/venture/public-talent-
// profile so the catalog pages are actually discoverable, not just the
// static top-level routes.
export default async function sitemap() {
  const supabase = await createClient();

  // Only routes robots.txt actually allows, and only ones that return a
  // page. /login and /signup were listed here while robots.js disallows
  // them — submitting a blocked URL is a Search Console error, not a
  // ranking. '' was listed too, and the app root is a redirect to /login
  // or /dashboard, so it was a sitemap entry that never resolves to
  // content. The marketing site is the real homepage and is deployed
  // separately with its own sitemap.
  const staticRoutes = ['/store', '/academy', '/marketplace', '/ventures'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  const [{ data: products }, { data: courses }, { data: ventures }, { data: talent }] = await Promise.all([
    supabase.rpc('list_published_products'),
    supabase.rpc('list_published_courses'),
    supabase.rpc('list_published_ventures'),
    supabase.rpc('list_public_talent'),
  ]);

  const productRoutes = (products || []).map((p) => ({
    url: `${SITE_URL}/store/${p.slug}`,
    lastModified: p.created_at ? new Date(p.created_at) : undefined,
  }));
  const courseRoutes = (courses || []).map((c) => ({
    url: `${SITE_URL}/academy/${c.slug}`,
    lastModified: c.created_at ? new Date(c.created_at) : undefined,
  }));
  const ventureRoutes = (ventures || []).map((v) => ({
    url: `${SITE_URL}/ventures/${v.slug}`,
    lastModified: v.created_at ? new Date(v.created_at) : undefined,
  }));
  const talentRoutes = (talent || []).map((t) => ({
    url: `${SITE_URL}/marketplace/${t.id}`,
  }));

  return [...staticRoutes, ...productRoutes, ...courseRoutes, ...ventureRoutes, ...talentRoutes];
}
