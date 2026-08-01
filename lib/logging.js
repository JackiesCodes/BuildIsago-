import { createAdminClient } from './supabase/admin';

// Fire-and-forget error visibility: a webhook or server action that fails
// should leave a trace even without a third-party error tracker
// configured. Every call site treats this the same way notifications.js
// treats email — a side effect that must never itself throw or block the
// caller. Sentry isn't wired in here on purpose: `import('@sentry/nextjs')`
// gets statically resolved by the bundler even behind a runtime check,
// so half-wiring it without the package actually installed breaks the
// build for everyone, not just projects that skip Sentry. Add real
// support with `npm install @sentry/nextjs` and a `Sentry.captureException`
// call here once a DSN is actually in use — see OPERATIONS.md.
export async function logError(context, error, detail) {
  try {
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
