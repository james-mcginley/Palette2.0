-- Palette — tastemaker flag for Feed/Discover shelves.
--
-- Decided: a simple boolean on profiles, set manually via the SQL editor —
-- the same "editorial content, seeded by an admin" pattern already used for
-- curator_paths (0003's own comment: "not user-authored UGC").
--
-- Column-level grants, not just RLS: the existing "users update their own
-- profile" policy is row-scoped (auth.uid() = id) with no column
-- restriction, so a plain `alter table add column` would let any user set
-- their own is_tastemaker to true via a direct client update — a trivial
-- self-promotion exploit. Postgres column-level GRANT/REVOKE closes that at
-- the privilege layer, independent of RLS: `authenticated` can only ever
-- touch the columns actually meant to be self-editable, regardless of what
-- a client tries to send.

alter table public.profiles
  add column is_tastemaker boolean not null default false;

revoke update on public.profiles from authenticated;
grant update (display_name, handle, bio, avatar_url, city, is_private, onboarding_completed_at)
  on public.profiles to authenticated;
