import Link from 'next/link';
import { getSessionProfile } from '@/lib/supabase/server';
import ThemeToggle from './ThemeToggle';

export default async function MarketplaceHeader() {
  const { user } = await getSessionProfile();

  return (
    <header className="store-header">
      <div className="container store-header-inner">
        <Link href="/marketplace" className="store-brand">
          <img src="/logo-icon.png" alt="" />
          <span>
            Build<span className="accent">Isago</span> Marketplace
          </span>
        </Link>
        <nav className="store-nav">
          {user ? (
            <Link href="/dashboard/marketplace">My Profile</Link>
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
