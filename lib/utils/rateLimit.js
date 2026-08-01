// Wraps check_rate_limit() (see 017_platform_hardening.sql). Fails open —
// if the RPC itself errors, the action proceeds rather than locking
// everyone out over a transient DB issue; the actual limit enforcement
// still stops runaway abuse in the normal case.
export async function withinRateLimit(supabase, bucket, maxAttempts, windowMinutes) {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_bucket: bucket,
    p_max_attempts: maxAttempts,
    p_window_minutes: windowMinutes,
  });
  if (error) return true;
  return data !== false;
}
