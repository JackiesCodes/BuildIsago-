import { Resend } from 'resend';
import { createAdminClient } from './supabase/admin';

const DEFAULT_FROM = 'BuildIsago <onboarding@resend.dev>';

let cachedResend;

// Lazily constructed, and every function below swallows its own errors —
// notifications are a side effect, not the point of the action that
// triggered them. A missing RESEND_API_KEY, a missing SUPABASE_SECRET_KEY
// (needed to look up another user's email), or a Resend API error should
// never break sending a message, an invoice, or an approval request.
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!cachedResend) cachedResend = new Resend(process.env.RESEND_API_KEY);
  return cachedResend;
}

async function getUserEmail(userId) {
  if (!userId || !process.env.SUPABASE_SECRET_KEY) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user?.email) return null;
    return data.user.email;
  } catch (err) {
    console.error('Could not look up user email for notification:', err.message);
    return null;
  }
}

async function getStudioEmails() {
  if (!process.env.SUPABASE_SECRET_KEY) return [];
  try {
    const admin = createAdminClient();
    const { data: studioProfiles } = await admin.from('profiles').select('id').eq('role', 'studio');
    const emails = await Promise.all((studioProfiles || []).map((p) => getUserEmail(p.id)));
    return emails.filter(Boolean);
  } catch (err) {
    console.error('Could not look up studio emails for notification:', err.message);
    return [];
  }
}

async function send(to, subject, text) {
  const resend = getResend();
  const recipients = Array.isArray(to) ? to : [to].filter(Boolean);
  if (!resend || !recipients.length) return;

  try {
    await resend.emails.send({
      from: process.env.NOTIFICATIONS_FROM_EMAIL || DEFAULT_FROM,
      to: recipients,
      subject,
      text,
    });
  } catch (err) {
    console.error('Notification email failed:', err.message);
  }
}

/** Emails one specific user (looked up by id) — e.g. the client on a project. */
export async function notifyUser(userId, { subject, text }) {
  const email = await getUserEmail(userId);
  await send(email, subject, text);
}

/** Emails every studio account — there's no per-project assignment, so everyone gets it. */
export async function notifyStudio({ subject, text }) {
  const emails = await getStudioEmails();
  await send(emails, subject, text);
}
