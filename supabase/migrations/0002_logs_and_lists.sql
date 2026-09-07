-- Palette — the core loop: logging and lists.
--
-- Media is never stored as its own first-class row here. `normalizeMedia`
-- (supabase/functions/_shared/normalizeMedia.ts) already produces a stable,
-- provider-prefixed `media_id` ("tmdb:movie:603") and a small MediaItem
-- shape — that snapshot is cheap enough to duplicate onto every log/list_item
-- row, which means the library and feed never re-fetch a provider just to
-- render a title the user already logged. `media_id` is kept as a plain
-- column (not a foreign key) so a provider swap or a stale cache entry can
-- never orphan a user's own logged history.

create type media_type as enum ('FILM', 'TV', 'BOOK', 'VINYL', 'CAST', 'EVENT');
create type visibility as enum ('public', 'friends', 'private');
create type item_status as enum ('want', 'in_progress', 'consumed');

create table public.logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  media_id      text not null,
  media_type    media_type not null,
  media_snapshot jsonb not null,   -- MediaItem at the time of logging
  rating        numeric(2,1) check (rating between 0 and 5),
  review        text check (char_length(review) <= 4000),
  logged_on     date not null default current_date,
  visibility    visibility not null default 'public',
  hidden_at     timestamptz,       -- moderation: set by auto-hide or a moderator
  created_at    timestamptz not null default now()
);
alter table public.logs enable row level security;

create index logs_user_idx on public.logs (user_id, logged_on desc);
create index logs_media_idx on public.logs (media_id);

create policy "users manage their own logs"
  on public.logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public/friends visibility is enforced by the `visible_logs` view
-- (0005_moderation.sql), which also applies the block and hidden_at filters.
-- This table-level policy only ever grants the owner direct access.

create table public.lists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null check (char_length(title) <= 120),
  description  text check (char_length(description) <= 500),
  is_smart     boolean not null default false,  -- system lists: "Want", "In Progress", "Consumed"
  visibility   visibility not null default 'private',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.lists enable row level security;

create policy "users manage their own lists"
  on public.lists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.list_items (
  id             uuid primary key default gen_random_uuid(),
  list_id        uuid not null references public.lists(id) on delete cascade,
  media_id       text not null,
  media_type     media_type not null,
  media_snapshot jsonb not null,
  status         item_status not null default 'want',
  position       integer not null default 0,
  added_at       timestamptz not null default now(),
  consumed_at    timestamptz,
  unique (list_id, media_id)
);
alter table public.list_items enable row level security;

create index list_items_list_idx on public.list_items (list_id, position);

create policy "users manage items in their own lists"
  on public.list_items for all
  using (exists (
    select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()
  ));

-- Every account gets the three smart lists on signup — "My List" in the
-- brief is these three buckets, not a single undifferentiated pile.
create or replace function public.create_default_lists()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.lists (user_id, title, is_smart, visibility)
  values
    (new.id, 'Want', true, 'private'),
    (new.id, 'In Progress', true, 'private'),
    (new.id, 'Consumed', true, 'private');
  return new;
end;
$$;

create trigger on_profile_created_default_lists
  after insert on public.profiles
  for each row execute function public.create_default_lists();
