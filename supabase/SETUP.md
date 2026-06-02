# Shared Sessions setup (Supabase)

Shared sessions let everyone order from their own phone. They're **optional** —
without Supabase configured, the app still works in local (single-device) mode.
The "Start Shared Session" button only appears once the keys below are set.

## 1. Create a Supabase project
1. Sign up at https://supabase.com (free tier is fine).
2. Create a new project. Wait for it to finish provisioning.

## 2. Create the tables
1. In the dashboard, open **SQL Editor → New query**.
2. Paste the contents of [`schema.sql`](./schema.sql) and click **Run**.
   This creates the `sessions` and `session_orders` tables, enables realtime,
   and sets open row-level-security policies (anyone with a session link can
   read/write that session — fine for casual meals, don't store anything
   sensitive).

## 3. Get your API keys
**Project Settings → API**, copy:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

(The `anon` key is meant to be public/in the browser. Never use the
`service_role` key here.)

## 4. Set the env vars
These are build-time vars read by Vite, so they must be present **when the site
builds**.

**Local dev** — add to `.env` in the project root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

**Netlify** — Site configuration → Environment variables → add both, then
redeploy (env changes only apply to new builds).

## 5. Use it
1. New session → pick a restaurant → **Start Shared Session**.
2. Enter your name; you'll see a **QR code / share link** (also reachable via the
   share icon on the order screen).
3. Others scan/open the link, enter their name, and order on their own phone.
4. Everyone's orders and the bill update live. Anyone can toggle service charge /
   GST and set who paid.

## How it works (for maintainers)
- `sessions` holds one row per shared meal, with the **menu snapshotted** so
  guests don't need the host's local data.
- `session_orders` holds one row per `(session, user)`. Each device writes only
  its own user's row, so simultaneous ordering never overwrites anyone else.
- The app subscribes to Supabase realtime on both tables and refetches on any
  change. See [`../src/hooks/useSharedSession.js`](../src/hooks/useSharedSession.js).
- Local single-device sessions are unchanged and still use `localStorage`.
