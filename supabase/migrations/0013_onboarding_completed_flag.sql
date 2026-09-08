-- Palette — the onboarding flag RootNavigator needs.
--
-- RootNavigator currently swaps straight to Main the instant `session` is
-- set, which happens as soon as WelcomeScreen's Sign in with Apple call
-- resolves — before any of the other four onboarding steps (import lists,
-- loved titles, genres, follow people) ever get a chance to render. This is
-- the server-side half of the fix: a durable, per-user flag that survives
-- app restarts and reinstalls (unlike a local-only flag), set once at the
-- end of the FollowPeople step.

alter table public.profiles
  add column onboarding_completed_at timestamptz;
