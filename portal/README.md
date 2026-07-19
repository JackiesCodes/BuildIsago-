# BuildIsago Portal

Client portal + internal studio dashboard, built with Next.js and Supabase
(Postgres, Auth, Storage). Clients sign up, submit project briefs, message
the studio, and share files. Studio accounts see every project across all
clients and manage status.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Create a new project (pick any name/region, set a database password).
3. In **Project Settings → API**, copy the **Project URL** and the
   **anon public** key.

## 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with
the values from step 1. Both are safe to expose client-side — access
control is enforced by the Row Level Security policies below, not by
keeping this key secret.

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

This is a standard Next.js app — deploy it to
[Vercel](https://vercel.com) (recommended) or any Node host. Add the same
two environment variables in your host's project settings.

The marketing site at the repo root is a separate static site and deploys
independently. Once the portal has a URL, point the marketing site's
"Start a Project" / "Client Login" links at it.
