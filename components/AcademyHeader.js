import Link from 'next/link';
import { getSessionProfile } from '@/lib/supabase/server';
import ThemeToggle from './ThemeToggle';

export default async function AcademyHeader() {
  const { user } = await getSessionProfile();

  return (
    <header className="store-header">
      <div className="container store-header-inner">
        <Link href="/academy" className="store-brand">
          <img src="/logo-icon.png" alt="" />
          <span>
            Build<span className="accent">Isago</span>
          </span>
        </Link>
        <nav className="store-nav">
          {user ? (
            <Link href="/dashboard/academy">My Courses</Link>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="btn btn-ghost btn-sm">
                Sign up
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
