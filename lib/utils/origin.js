import { headers } from 'next/headers';

export async function getOrigin() {
  const h = await headers();
  const host = h.get('host');
  const protocol = host?.includes('localhost') || host?.includes('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${host}`;
}
