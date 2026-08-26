import { getSessionProfile } from '@/lib/supabase/server';
import QuickStartCard from '@/components/QuickStartCard';
import DashboardHero from '@/components/DashboardHero';
import { SERVICES } from '@/lib/constants/services';

/**
 * The client portal's home: a composer and the five services, nothing
 * else. Every card creates and opens its tool, so there is no engagement
 * mode to branch on here any more — the portal is self-service for
 * everyone.
 */
export default async function ClientDashboard() {
  const { user, profile } = await getSessionProfile();

  const firstName = (profile?.full_name || user.email || '').split(/[\s@]/)[0];

  // .home-view is what makes this the one page that fits the window:
  // it centres in the space the shell leaves and lets the spacing
  // compress on short screens rather than pushing the cards below the fold.
  return (
    <div className="home-view">
      <DashboardHero firstName={firstName} />

      <div className="quick-start-grid">
        {SERVICES.map(({ value, label, description }) => (
          <QuickStartCard key={value} value={value} label={label} description={description} />
        ))}
      </div>
    </div>
  );
}
