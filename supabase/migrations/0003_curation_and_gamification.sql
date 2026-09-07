-- Palette — curated bundles and the Duolingo-style curator paths.

create table public.curations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null check (char_length(title) <= 120),
  description  text check (char_length(description) <= 500),
  cover_media_id text,
  visibility   visibility not null default 'public',
  hidden_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.curations enable row level security;

create policy "users manage their own curations"
  on public.curations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.curation_items (
  id             uuid primary key default gen_random_uuid(),
  curation_id    uuid not null references public.curations(id) on delete cascade,
  media_id       text not null,
  media_type     media_type not null,
  media_snapshot jsonb not null,
  position       integer not null default 0,
  note           text check (char_length(note) <= 500),
  unique (curation_id, media_id)
);
alter table public.curation_items enable row level security;

create policy "users manage items in their own curations"
  on public.curation_items for all
  using (exists (
    select 1 from public.curations c where c.id = curation_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.curations c where c.id = curation_id and c.user_id = auth.uid()
  ));

-- Curator paths are editorial content (seeded by Palette, not user-authored
-- UGC), so they read like a CMS table: publishable, edited by an admin role
-- via the service key, world-readable once published.

create table public.curator_paths (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  description  text,
  curator_name text not null,
  curator_bio  text,
  cover_image_url text,
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table public.curator_paths enable row level security;

create policy "published curator paths are publicly readable"
  on public.curator_paths for select using (published);

create table public.curator_path_nodes (
  id           uuid primary key default gen_random_uuid(),
  path_id      uuid not null references public.curator_paths(id) on delete cascade,
  position     integer not null,
  title        text not null,
  media_refs   jsonb not null default '[]'::jsonb, -- [{ media_id, media_type, snapshot }]
  unique (path_id, position)
);
alter table public.curator_path_nodes enable row level security;

create policy "nodes of published paths are publicly readable"
  on public.curator_path_nodes for select using (exists (
    select 1 from public.curator_paths p where p.id = path_id and p.published
  ));

create table public.user_path_progress (
  user_id            uuid not null references auth.users(id) on delete cascade,
  path_id            uuid not null references public.curator_paths(id) on delete cascade,
  current_node_position integer not null default 1,
  completed_at       timestamptz,
  started_at         timestamptz not null default now(),
  primary key (user_id, path_id)
);
alter table public.user_path_progress enable row level security;

create policy "users manage their own path progress"
  on public.user_path_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.badges (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,          -- "french_new_wave_scholar"
  name        text not null,
  description text,
  icon_url    text,
  path_id     uuid references public.curator_paths(id) on delete set null
);
alter table public.badges enable row level security;

create policy "badges are publicly readable"
  on public.badges for select using (true);

create table public.user_badges (
  user_id    uuid not null references auth.users(id) on delete cascade,
  badge_id   uuid not null references public.badges(id) on delete cascade,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);
alter table public.user_badges enable row level security;

create policy "user badges are publicly readable"
  on public.user_badges for select using (true);
create policy "badges are awarded server-side only"
  on public.user_badges for insert with check (false);

-- Completing the final node awards the badge atomically with the progress
-- row, so a client can never mark itself complete without earning the badge
-- (and can never award a badge without actually finishing the path).
create or replace function public.complete_curator_path(p_path_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_node_count integer;
  v_badge_id uuid;
begin
  select count(*) into v_node_count from public.curator_path_nodes where path_id = p_path_id;

  update public.user_path_progress
  set current_node_position = v_node_count + 1,
      completed_at = now()
  where user_id = auth.uid() and path_id = p_path_id;

  select id into v_badge_id from public.badges where badges.path_id = p_path_id;
  if v_badge_id is not null then
    insert into public.user_badges (user_id, badge_id)
    values (auth.uid(), v_badge_id)
    on conflict do nothing;
  end if;
end;
$$;
