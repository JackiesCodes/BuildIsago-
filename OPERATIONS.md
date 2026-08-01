# Operations

This covers what running BuildIsago in production actually requires beyond
the feature setup in `README.md` — backups, staging, and the handful of
things that need a human decision rather than a code change.

## Backups & disaster recovery

Supabase takes automatic daily backups on paid plans (point-in-time
recovery on Pro and above). There's no additional backup job in this
repo — if you're on the Free plan, upgrade before this matters in
practice, since Free-plan projects can be paused after inactivity and
have no PITR.

Recovery drill checklist (do this once, before you need it for real):
1. From the Supabase dashboard, restore a backup into a new project.
2. Point a local `.env.local` at the restored project.
3. Confirm `npm run build` succeeds and a few key pages load against it.
4. Note how long the restore actually took — that's your real RTO.

## Staging environment

Supabase branching (a full copy of the schema, isolated from production
data) is the natural staging setup here — every migration in
`supabase/migrations/` applies cleanly to a branch the same way it does
to production. **This has a real recurring cost** (~$0.0134/hour per
branch, roughly $9–10/month if left running continuously) — it wasn't
created automatically for that reason. To set one up:

```
mcp__Supabase__create_branch (or, from the dashboard: Project → Branches → New branch)
```

Point a preview Vercel deployment's environment variables at the
branch's project URL/keys instead of production, so pull requests get a
real, isolated environment before merging.

## External dependencies not wired up

These are genuine gaps, not oversights — each needs an account/decision
from you, not just code:

- **Error tracking (Sentry).** Not wired in — a first attempt at this
  used a runtime-checked `import('@sentry/nextjs')` without the package
  actually installed, which broke the build entirely (webpack resolves
  dynamic `import()` calls at bundle time regardless of the runtime
  check around them). To add it properly: `npm install @sentry/nextjs`,
  then call `Sentry.captureException(...)` directly inside
  `lib/logging.js`'s `logError()` — a normal top-level import once the
  package exists is fine, no lazy-loading trick needed. Until then,
  errors land in the in-app `error_log` table (Studio → Activity), which
  works regardless.
- **CAPTCHA / bot protection.** Rate limiting (`check_rate_limit`) covers
  volume-based abuse, but nothing stops a scripted bot from submitting
  one request per window. Adding Cloudflare Turnstile (free) to the
  login/signup/pitch forms would close that gap — needs a site key from
  a Turnstile account.
- **Stripe Tax.** Checkout sessions don't calculate sales tax/VAT — if
  you have tax nexus anywhere customers are buying from, that's a
  compliance gap today. Turning on `automatic_tax: { enabled: true }` in
  the checkout session calls is a small code change, but tax
  registration itself is a business/legal decision, not something to
  flip on silently.
- **Real legal review.** `/privacy` and `/terms` are genuine first
  drafts reflecting the product's actual data practices (see the
  comments at the top of each page's source) — not a substitute for a
  lawyer's review, especially for GDPR/CCPA specifics and your actual
  operating jurisdiction.
- **SOC2 / security page.** Worth having before selling into enterprise
  or government accounts, per the target market in the brand doc. Not
  something code can produce — it's a compliance program.

## What's already covered

- Automated tests (`npm test`) + CI (`.github/workflows/ci.yml`) running
  lint, tests, and build on every push/PR.
- Error and audit logging (`error_log`, `audit_log` tables — visible at
  Studio → Activity).
- Rate limiting on login, signup, password reset, venture pitches, and
  talent hire requests.
- Password reset and TOTP two-factor authentication (Settings → Two-factor
  authentication), enforced server-side in middleware — not just a
  client-side redirect.
- Refund sync: issuing a refund through the app (or directly in the
  Stripe dashboard) now updates the invoice/purchase/enrollment status
  and notifies the relevant party. **One manual step remains**: add the
  `charge.refunded` event to the Stripe webhook endpoint's subscribed
  events (alongside the existing `checkout.session.completed`,
  `customer.subscription.updated`, `customer.subscription.deleted`) —
  the webhook code already handles it, it just isn't subscribed yet.
- Basic RBAC: a studio account can be a "member" (`is_owner = false`)
  with full day-to-day visibility but no ability to create/edit/delete
  invoices, retainers, or ventures. Set via the dashboard, same as the
  studio promotion step itself.
- SEO: `robots.txt`, a dynamic `sitemap.xml` covering every published
  product/course/venture/talent profile, and consistent Open Graph
  metadata.
