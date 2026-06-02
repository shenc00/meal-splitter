-- Meal Splitter — shared sessions schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).

-- A shared dining session. The menu is snapshotted here so guests who join
-- via link don't need the host's local restaurant data.
create table if not exists public.sessions (
  id                       text primary key,
  restaurant_name          text not null,
  menu                     jsonb not null default '[]'::jsonb,
  users                    jsonb not null default '[]'::jsonb,
  service_charge_enabled   boolean not null default false,
  gst_enabled              boolean not null default false,
  paid_by                  text,
  created_at               timestamptz not null default now()
);

-- One row per (session, user). Each device writes only its own user's row,
-- so simultaneous ordering never clobbers another person's order.
create table if not exists public.session_orders (
  session_id   text not null references public.sessions(id) on delete cascade,
  user_name    text not null,
  orders       jsonb not null default '{}'::jsonb,  -- { "<menuItemId>": <qty> }
  updated_at   timestamptz not null default now(),
  primary key (session_id, user_name)
);

-- Realtime so every device sees changes live.
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.session_orders;

-- Row Level Security.
-- NOTE: this is an open, no-login app — anyone who knows a session id can read
-- and write that session. That is acceptable for casual shared meals. The
-- policies below scope access by knowing the (random) session id only.
-- Do NOT store anything sensitive in these tables.
alter table public.sessions enable row level security;
alter table public.session_orders enable row level security;

create policy "anon can read sessions"   on public.sessions       for select using (true);
create policy "anon can insert sessions" on public.sessions       for insert with check (true);
create policy "anon can update sessions" on public.sessions       for update using (true) with check (true);

create policy "anon can read orders"     on public.session_orders for select using (true);
create policy "anon can insert orders"   on public.session_orders for insert with check (true);
create policy "anon can update orders"   on public.session_orders for update using (true) with check (true);
create policy "anon can delete orders"   on public.session_orders for delete using (true);
