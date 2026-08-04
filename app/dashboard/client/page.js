import { getSessionProfile } from '@/lib/supabase/server';
import QuickStartCard from '@/components/QuickStartCard';
import DashboardHero from '@/components/DashboardHero';
import { SERVICES } from '@/lib/constants/services';
import { isSelfServe } from '@/lib/engagement';

/**
 * Home is only ever the hero and the service cards now. Searching and
 * the full project list moved to /dashboard/client/projects, so this
 * page no longer needs to query projects at all.
 */
export default async function ClientDashboard() {
  const { user, profile } = await getSessionProfile();

  const firstName = (profile?.full_name || user.email || '').split(/[\s@]/)[0];
  const selfServe = isSelfServe(profile);

  // .home-view is what makes this the one page that fits the window:
  // it centres in the space the shell leaves and lets the spacing
  // compress on short screens rather than pushing the cards below the fold.
  return (
    <div className="home-view">
      <DashboardHero firstName={firstName} selfServe={selfServe} />

      <div className="quick-start-grid">
        {SERVICES.map(({ value, label, description }) => (
          <QuickStartCard
            key={value}
            value={value}
            label={label}
            description={description}
            selfServe={selfServe}
          />
        ))}
      </div>
    </div>
  );
}
