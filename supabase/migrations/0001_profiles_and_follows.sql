-- Palette — core identity
-- Profiles are 1:1 with auth.users; follows are the social graph everything
-- else (feed, blocks, visibility) is filtered through.

create extension if not exists pgcrypto;

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  handle       text unique,
  bio          text check (char_length(bio) <= 300),
  avatar_url   text,
  city         text,              -- user-entered, not device GPS
  is_private   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select using (true);
create policy "users insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "users update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile row the moment a user signs up, so the client never
-- has to race a manual insert against the first screen that reads it.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  followee_id  uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
alter table public.follows enable row level security;

create policy "follows are publicly readable"
  on public.follows for select using (true);
create policy "users manage their own follows"
  on public.follows for insert with check (auth.uid() = follower_id);
create policy "users remove their own follows"
  on public.follows for delete using (auth.uid() = follower_id);

create index follows_followee_idx on public.follows (followee_id);
