# BuildIsago Portal

Client portal + internal studio dashboard, built with Next.js and Supabase
(Postgres, Auth, Storage). Clients sign up, submit project briefs, message
the studio, and share files. Studio accounts see every project across all
clients and manage status.

This app lives at the repo root so it deploys with zero configuration (no
Root Directory setting needed). The static marketing site lives in
[`/site`](./site) and deploys separately — see the note at the bottom.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Create a new project (pick any name/region, set a database password).
3. In **Project Settings → API**, copy the **Project URL** and the
   **publishable** key (`sb_publishable_...`).

## 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
with the values from step 1. Both are safe to expose client-side — access
control is enforced by the Row Level Security policies below, not by
keeping this key secret. Never use the **secret** key (`sb_secret_...`) here
— that one bypasses Row Level Security and must never be shipped to the
browser.

For the AI-generated project drafts feature (step 3b below), also set
`ANTHROPIC_API_KEY` — get one at
[console.anthropic.com](https://console.anthropic.com) (Settings → API Keys;
you'll need to add a payment method). Unlike the Supabase keys, this one has
**no** `NEXT_PUBLIC_` prefix — it must stay server-only, since it can spend
real money if exposed. The app runs fine without it; only the "Generate AI
First Draft" button will show an error until it's set.

## 3. Set up the database

In the Supabase dashboard, open **SQL Editor → New query**, paste the
contents of `supabase/schema.sql`, and run it. This creates:

- `profiles`, `projects`, `messages`, `project_files`, `project_milestones`,
  `project_designs`, `project_brand_kits`, `project_dev_scopes`,
  `project_references`, `project_invoices`, `project_approvals`, `products`,
  `product_purchases` tables
- Row Level Security policies (clients see only their own projects; studio
  accounts see everything)
- A trigger that auto-creates a profile when someone signs up
- A private `project-files` storage bucket with matching access policies
- Due dates, priority, and AI-draft columns on `projects`

If you set up the database before the milestones/due-dates, AI-draft,
Design Studio, Brand Studio, Dev Studio, or References features existed,
run the incremental files in `supabase/migrations/` in order instead of
re-running the whole `schema.sql` (which would error on policies that
already exist).
If you ever hit "infinite recursion detected in policy for relation
'profiles'", run `supabase/migrations/004_fix_studio_policy_recursion.sql`
— it replaces the recursive studio-role check with a `SECURITY DEFINER`
helper function.

## 4. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Sign up — this creates a `client` account
by default.

## 5. Create a studio (admin) account

Anyone can self-serve sign up as a **client**. Studio accounts are not
self-service (so random signups can't grant themselves admin access).

To promote your own account to studio: sign up normally, then in the
Supabase dashboard go to **Table Editor → profiles**, find your row, and
change `role` from `client` to `studio`. Refresh the app — you'll now see
every client's projects instead of just your own.

## 6. AI-generated first drafts

Clients can click "Generate AI First Draft" on any project to get an
instant starting point (a tech scope for software, a brand direction for
branding, a creative direction for design) before a human looks at it. This
calls the Claude API (`claude-opus-4-8`) server-side and costs a small
amount per generation — see [pricing](https://claude.com/pricing). To use a
cheaper/faster model instead, change the `model` value in
`lib/actions/ai-draft.js`.

## 7. Design Studio

Any project — client or studio side — can create design documents (social
posts, presentation slides, flyers) right in the portal at `/design/<projectId>/<designId>`.
It's a real canvas editor built on [Fabric.js](http://fabricjs.com/): add
shapes/text/images, edit fill color and typography, reorder layers, and
export to PNG or PDF. Designs are saved per-project as JSON in
`project_designs.canvas_json`. No separate design tool required.

## 8. Brand Studio

Any project can have one brand kit — colors (with live WCAG contrast checks
against white/black), heading/body typography from a curated Google Fonts
list with a live preview, a tagline, and a voice/tone description. "Generate
with AI" drafts 3 tagline options plus a voice/tone paragraph from the
project's brief using the same Claude integration as AI drafts — no new API
or cost surface. Every brand kit also gets a public, no-login-required
"Brand Guidelines" page at `/brand/<share_token>` that a client can hand to
their own team or a print vendor. The public page is served through a
`SECURITY DEFINER` Postgres function (`get_public_brand_kit`) scoped to an
unguessable per-kit token, so RLS never has to be opened up to anonymous
users generally.

## 9. Dev Studio

Any project can have one technical scope — features, tech stack (with a
rationale per choice), build phases, and risks/open questions, each an
independently editable list. "Generate with AI" drafts all four sections
from the project's brief using the same Claude integration as the other
Studios. A project can also link a **public** GitHub repo (`owner/repo` or
a full URL) to see its recent commits, open issues, and open pull requests
live, pulled server-side from the unauthenticated GitHub REST API — no
token is stored anywhere, so this only ever works for public repos.
Unauthenticated GitHub requests are capped at 60/hour per IP; results are
cached for 2 minutes to keep repeat views from hitting that limit. Private
repo support would need a stored access token, which is a real credential-
security decision left for later rather than bolted on here.

## 10. References (Design Studio)

Any project can hold a moodboard of reference images — paste an image URL
(e.g. a Pinterest pin's image link) or upload a file. Pasted URLs are
fetched **server-side** and re-hosted in the project's own storage before
anything touches the browser, for two reasons: pixel access to a
cross-origin image is blocked by the browser's canvas security model, and
external URLs (especially social-media CDN links) break or expire.

Two extraction features, both real:
- **Dominant color palette** — computed client-side from actual pixel data
  (downsample, quantize, pick the most frequent well-separated buckets) —
  not AI, deterministic, free. One click adds any swatch to the project's
  Brand Kit.
- **Text detection** — reads any text visible in the image via the same
  Claude vision call pattern used elsewhere, on demand (not automatic, to
  control cost).

What this **doesn't** do: cut a specific element (a logo, an icon, a
person) out of a busy image as a clean, transparent, reusable asset — true
background removal/segmentation needs a dedicated image-processing model
that isn't part of this stack. Saved references also show up inside the
Design Studio editor's toolbar so you can drop them onto a canvas to trace
over.

## 11. Invoicing & Payments

Studio accounts can bill any project directly from its detail page: create a
draft invoice, add line items (description/quantity/unit price), set a tax
rate, currency, and due date, then send it. Sending posts a message in the
project's conversation thread and unlocks it for the client to view and pay
— drafts are never visible to clients (enforced by Row Level Security, not
just the UI). A studio can also mark an invoice paid manually (bank
transfer, cash) or void it.

Clients pay a sent invoice with **Pay now**, which redirects to a
Stripe-hosted Checkout page. To wire this up:

1. Run `supabase/migrations/009_invoices.sql` (or the updated `schema.sql`
   for a fresh install) to create the `project_invoices` table.
2. Get a Stripe account and, from the [Stripe dashboard](https://dashboard.stripe.com/apikeys),
   copy the **secret key** into `STRIPE_SECRET_KEY`. Like `ANTHROPIC_API_KEY`,
   this has no `NEXT_PUBLIC_` prefix and must stay server-only.
3. Set `SUPABASE_SECRET_KEY` to the Supabase project's **secret** key
   (Project Settings → API) — server-only, never the publishable one. This
   is used exclusively by the Stripe webhook route below, which has no
   user session to authenticate as and needs it to mark an invoice paid.
4. In the Stripe dashboard, add a webhook endpoint pointing at
   `https://<your-domain>/api/stripe/webhook` listening for
   `checkout.session.completed`, and copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`. For local development, use the
   [Stripe CLI](https://stripe.com/docs/stripe-cli) instead:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Without these three variables, invoices can still be created, edited, and
sent — only the "Pay now" button degrades, with a message pointing the
client to arrange payment with the studio directly.

## 12. Approvals

Studio accounts can ask a client to sign off on something — a brief, a
direction, a scope, optionally linked to one of the project's Design Studio
documents — from the Approvals tab on any project. A draft stays internal
until sent; sending posts a message in the project's conversation thread
and unlocks it for the client. The client then approves or requests changes
with a note, either way logged with a timestamp and also posted back into
the conversation thread. Run `supabase/migrations/010_approvals.sql` (or
the updated `schema.sql` for a fresh install) to create the
`project_approvals` table — no new environment variables or third-party
services are needed for this one.

## 13. Email notifications

Every event that already surfaces inside the portal also emails whoever
needs to act on it, via [Resend](https://resend.com):

- New message → the studio (all studio accounts) if a client sent it, or
  the client if the studio sent it
- Invoice sent → the client
- Invoice paid → the studio
- Approval request sent → the client
- Approval approved or changes requested → the studio
- New project submitted → the studio

There's no per-project assignment of a specific studio member, so
studio-directed emails go to every account with `role = 'studio'`.

To turn this on:

1. Get a [Resend](https://resend.com/api-keys) API key and set
   `RESEND_API_KEY`.
2. Make sure `SUPABASE_SECRET_KEY` is set too (see the Invoicing section
   above) — notifications use it to look up a recipient's email address,
   the same admin client the Stripe webhook uses.
3. Optionally set `NOTIFICATIONS_FROM_EMAIL`. Until you verify a sending
   domain in Resend, email can only be delivered to the address you signed
   up to Resend with — fine for testing the flow end-to-end, but add a
   verified domain before relying on this for real clients.

Without `RESEND_API_KEY` (or `SUPABASE_SECRET_KEY`), every action above
still works exactly as before — sending an invoice, posting a message,
deciding an approval — the email is just silently skipped and logged
server-side.

## 14. Digital Products storefront

A public storefront (no login required to browse) at `/store` for selling
UI kits, website templates, brand templates, and design systems — the
"Digital Products" revenue stream, and the one part of the client-project
portal that isn't tied to any client project.

- Studio manages the catalog at `/dashboard/studio/products`: title, slug,
  category, price (0 for a free product), a public preview image, and the
  private downloadable file. A product only shows up in the store once
  it's published.
- Anyone can browse `/store` and view a product page without an account.
  Buying (or claiming a free one) requires signing in — an unauthenticated
  visitor is sent to `/login?next=/store/<slug>` and lands back on the
  same page after signing in or creating an account.
- Paid products go through the same Stripe Checkout used by invoicing —
  no new Stripe setup needed beyond what's in section 11. Free products
  are granted instantly through a `claim_free_product()` database
  function, no Stripe involved.
- Every purchase (or free claim) is emailed to the buyer and to the studio
  via the notifications from section 13, and the file becomes downloadable
  from `/dashboard/downloads` for any signed-in user, client or studio.
- The downloadable file lives in a **private** storage bucket
  (`product-files`), gated by Row Level Security on a matching paid row in
  `product_purchases` — the same pattern `project-files` uses for project
  membership. Preview images live in a public bucket instead, since
  showing them off is the whole point of a storefront.

Run `supabase/migrations/011_products.sql` (or the updated `schema.sql`
for a fresh install) to set this up. No new environment variables beyond
what invoicing and notifications already need.

## 15. Deploy

This is a standard Next.js app rooted at the repo root — import the repo in
[Vercel](https://vercel.com) with the default settings (no Root Directory
override needed) and add the environment variables (Supabase URL, Supabase
publishable key, `ANTHROPIC_API_KEY`, and — if invoicing or notifications
are in use — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`) in the
project's settings.

## 16. The marketing site

The static marketing site (`index.html` + `assets/`) lives in
[`/site`](./site) and is unrelated to this Next.js app — it doesn't get
built or deployed by `npm run build` here. To put it online, deploy `/site`
as its own static site (its own Vercel project with Root Directory set to
`site`, or any static host), typically on the apex domain
(`buildisago.com`) while this portal lives on a subdomain
(`app.buildisago.com` or similar). Once both are live, point the marketing
site's "Start a Project" / "Client Login" links at the portal's URL.
