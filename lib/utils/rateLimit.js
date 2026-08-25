// Wraps check_rate_limit() (see 017_platform_hardening.sql). Fails open —
// if the RPC itself errors, the action proceeds rather than locking
// everyone out over a transient DB issue; the actual limit enforcement
// still stops runaway abuse in the normal case.
//
// ONLY call this from a server action ('use server'). It is not a limit
// you can enforce from the browser.
//
// Login, signup and password reset used to call this from their client
// components, which made it worse than useless on two counts:
//
//   1. It stopped nobody. The check was a conditional in the browser
//      guarding a call the browser then made straight to Supabase Auth.
//      Anyone attacking the endpoint simply doesn't run the check.
//   2. It was a denial-of-service tool. check_rate_limit has to be
//      callable by `anon` (that is what let the login page use it), and
//      the bucket key was the victim's own email address. Nine POSTs to
//      /rest/v1/rpc/check_rate_limit with `login:someone@example.com`
//      exhausted that bucket, and from then on the real owner's browser
//      refused to attempt a login at all. Verified against the live
//      database before removing it.
//
// Supabase Auth applies its own server-side rate limits to those three
// endpoints, and those are the real control — they run where the attacker
// cannot skip them. Tune them in Auth → Rate Limits rather than
// reintroducing a client-side check here.
//
// The two remaining callers (talent requests, venture applications) are
// both server actions keyed on the signed-in user's id, so neither problem
// applies to them.
export async function withinRateLimit(supabase, bucket, maxAttempts, windowMinutes) {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_bucket: bucket,
    p_max_attempts: maxAttempts,
    p_window_minutes: windowMinutes,
  });
  if (error) return true;
  return data !== false;
}
