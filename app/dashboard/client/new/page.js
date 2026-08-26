import { redirect } from 'next/navigation';

/**
 * The brief form is retired. It existed so a managed client could describe
 * work for the studio to pick up; the portal is self-service now, and the
 * five service cards on the home page create and open the work directly.
 *
 * Kept as a redirect rather than deleted: this URL is in old emails, in
 * notifications, and was the sidebar's "New Project" target for months.
 * A 404 for those is worse than landing on the place that replaced it.
 */
export default function NewProjectRedirect() {
  redirect('/dashboard/client');
}
