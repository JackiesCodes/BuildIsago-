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

## 3. Set up the database

In the Supabase dashboard, open **SQL Editor → New query**, paste the
contents of `supabase/schema.sql`, and run it. This creates:

- `profiles`, `projects`, `messages`, `project_files` tables
- Row Level Security policies (clients see only their own projects; studio
  accounts see everything)
- A trigger that auto-creates a profile when someone signs up
- A private `project-files` storage bucket with matching access policies

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

## 6. Deploy

This is a standard Next.js app rooted at the repo root — import the repo in
[Vercel](https://vercel.com) with the default settings (no Root Directory
override needed) and add the same two environment variables in the
project's settings.

## 7. The marketing site

The static marketing site (`index.html` + `assets/`) lives in
[`/site`](./site) and is unrelated to this Next.js app — it doesn't get
built or deployed by `npm run build` here. To put it online, deploy `/site`
as its own static site (its own Vercel project with Root Directory set to
`site`, or any static host), typically on the apex domain
(`buildisago.com`) while this portal lives on a subdomain
(`app.buildisago.com` or similar). Once both are live, point the marketing
site's "Start a Project" / "Client Login" links at the portal's URL.
