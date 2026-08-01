import { createAdminClient } from './supabase/admin';

// Fire-and-forget error visibility: a webhook or server action that fails
// should leave a trace even without a Sentry account configured. Every
// call site treats this the same way notifications.js treats email — a
// side effect that must never itself throw or block the caller.
export async function logError(context, error, detail) {
  try {
    if (process.env.SENTRY_DSN) {
      // Lazy-imported so the dependency is optional — nothing else in
      // this file needs it, and projects without a Sentry account never
      // pay for the import.
      const Sentry = await import('@sentry/nextjs').catch(() => null);
      Sentry?.captureException?.(error instanceof Error ? error : new Error(String(error)), { extra: { context, detail } });
    }

    if (!process.env.SUPABASE_SECRET_KEY) return;
    const admin = createAdminClient();
    await admin.from('error_log').insert({
      context,
      message: error instanceof Error ? error.message : String(error),
      detail: detail ?? (error instanceof Error ? { stack: error.stack } : null),
    });
  } catch (loggingError) {
    // Logging itself failing is not worth surfacing further — fall back
    // to the platform's own log stream so it isn't completely silent.
    console.error('logError failed:', loggingError, '(original:', context, error, ')');
  }
}

// Records an action on the audit trail via log_audit_event(), which
// stamps actor_id from the caller's own session — so this only needs an
// authenticated `supabase` client, never the admin client. Swallows its
// own errors the same way; an audit entry is a record, not something
// that should ever block the action it's describing.
export async function logAudit(supabase, action, targetType, targetId, detail) {
  try {
    await supabase.rpc('log_audit_event', {
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId ? String(targetId) : null,
      p_detail: detail ?? null,
    });
  } catch (err) {
    console.error('logAudit failed:', err, '(action:', action, ')');
  }
}
