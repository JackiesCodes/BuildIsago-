import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Supabase is contacted on every single request that isn't a static asset,
// so how this behaves when Supabase is unreachable decides how the whole
// site behaves. Production logs showed what happens without a guard:
// getaddrinfo ENOTFOUND on the Supabase host took out every route — the
// storefront and the marketing pages included — and three invocations hung
// until Vercel killed them at 25s.
//
// A DNS lookup that never resolves is not something try/catch alone
// rescues, so calls are given their own deadline first.
const AUTH_TIMEOUT_MS = 5000;

function timeoutFetch(input, init = {}) {
  return fetch(input, { ...init, signal: AbortSignal.timeout(AUTH_TIMEOUT_MS) });
}

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: { fetch: timeoutFetch },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const path = request.nextUrl.pathname;
  const isDashboard = path.startsWith('/dashboard');

  let isAuthed = false;
  try {
    const { data } = await supabase.auth.getClaims();
    isAuthed = Boolean(data?.claims);
  } catch (err) {
    // Whether this is safe to ignore depends entirely on where you were
    // going. Public pages don't need a session, so serving them beats
    // returning 500 to someone reading the storefront. The dashboard does,
    // and an unverifiable session is not a valid one — so it fails closed.
    console.error('middleware: auth check failed', err?.message);
    if (isDashboard) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (!isAuthed && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // Enforced server-side, not just as a post-login redirect in the login
  // page — otherwise anyone who already has a valid aal1 session (e.g. a
  // stolen password, no MFA code needed yet) could just navigate straight
  // to /dashboard and skip the second factor entirely.
  if (isAuthed && isDashboard) {
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        const url = request.nextUrl.clone();
        url.pathname = '/mfa-challenge';
        url.searchParams.set('next', path);
        return NextResponse.redirect(url);
      }
    } catch (err) {
      // Same reasoning as above, one step further in: this is the second
      // factor. If we can't confirm it has been satisfied, don't let the
      // request through on the assumption that it has.
      console.error('middleware: MFA level check failed', err?.message);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
  }

  if (isAuthed && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}
