-- Palette — shared search cache for the media-search edge function.
-- A thousand users searching "Aftersun" costs one round of provider calls,
-- not a thousand. TTL'd; swept nightly by pg_cron (see comment below).

create table public.search_cache (
  key         text primary key,
  payload     jsonb not null,
  expires_at  timestamptz not null
);
create index on public.search_cache (expires_at);

-- The cache is populated and read only by the media-search edge function
-- using the anon/authenticated key over PostgREST, so it needs RLS enabled
-- with policies open to any authenticated caller — there is no per-row
-- ownership concept here, unlike every other table in this schema.
alter table public.search_cache enable row level security;

create policy "authenticated users read the search cache"
  on public.search_cache for select
  using (auth.role() = 'authenticated');
create policy "authenticated users populate the search cache"
  on public.search_cache for insert
  with check (auth.role() = 'authenticated');
create policy "authenticated users refresh cache entries"
  on public.search_cache for update
  using (auth.role() = 'authenticated');

-- Requires pg_cron (enabled by default on Supabase projects). Run once,
-- manually, after this migration — pg_cron jobs are not migration objects.
-- select cron.schedule('search-cache-sweep', '0 3 * * *',
--   $$delete from public.search_cache where expires_at < now()$$);
