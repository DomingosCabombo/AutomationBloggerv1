-- ============================================================
--  Supabase Schema – Audio Mixing & Mastering Jobs
--  Run this in the Supabase SQL Editor (once)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Jobs table ───────────────────────────────────────────────
create table if not exists public.jobs (
  id              uuid primary key default uuid_generate_v4(),
  file_url        text not null,
  original_name   text,
  preset          text not null default 'auto',
  status          text not null default 'pending'
                    check (status in ('pending','processing','done','failed')),
  result_url      text,
  error_message   text,
  retry_count     integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-update updated_at on every row change
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row execute procedure set_updated_at();

-- Indexes for worker queries
create index if not exists jobs_status_created_idx
  on public.jobs (status, created_at asc)
  where status = 'pending';

create index if not exists jobs_status_updated_idx
  on public.jobs (status, updated_at asc)
  where status = 'processing';

-- ── Storage bucket ────────────────────────────────────────────
-- Run in Supabase dashboard OR via API:
-- create bucket "audio-jobs" (public: false, file_size_limit: 209715200)

-- ── Row Level Security (optional – for multi-tenant setups) ──
-- alter table public.jobs enable row level security;
-- create policy "service role full access" on public.jobs
--   using (auth.role() = 'service_role');

-- ── Sample query: fetch pending jobs ─────────────────────────
-- select * from jobs
--   where status = 'pending' and retry_count < 3
--   order by created_at asc
--   limit 5;
