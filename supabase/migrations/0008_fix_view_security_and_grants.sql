-- Palette — fix the SECURITY DEFINER view lint (ERROR level).
--
-- The four visible_* views currently work only because a view with no
-- explicit `security_invoker` runs as its owner (who isn't subject to the
-- underlying tables' RLS), not as the querying user. That's precisely what
-- the "public content is readable by anyone" logic needs — but it means the
-- view's own WHERE clause is the *entire* security boundary, which is what
-- Supabase's linter is flagging as worth confirming explicitly rather than
-- relying on implicitly.
--
-- The correct fix isn't to blindly set security_invoker=true (that would
-- make the views defer to each table's RLS, which currently only allows
-- owners to SELECT their own rows — every other user's feed would go empty).
-- Instead: add a real "public, non-hidden, non-blocked content is readable"
-- SELECT policy to each base table (so RLS itself now permits exactly what
-- the view's WHERE clause already expressed), then set security_invoker=true
-- so the view enforces that policy instead of bypassing RLS entirely.

create policy "public logs are readable by non-blocked users"
  on public.logs for select
  using (
    hidden_at is null
    and visibility = 'public'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = logs.user_id)
         or (b.blocked_id = auth.uid() and b.blocker_id = logs.user_id)
    )
  );

create policy "public curations are readable by non-blocked users"
  on public.curations for select
  using (
    hidden_at is null
    and visibility = 'public'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = curations.user_id)
         or (b.blocked_id = auth.uid() and b.blocker_id = curations.user_id)
    )
  );

create policy "open asks are readable by non-blocked users"
  on public.asks for select
  using (
    hidden_at is null
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = asks.user_id)
         or (b.blocked_id = auth.uid() and b.blocker_id = asks.user_id)
    )
  );

create policy "ask answers are readable by non-blocked users"
  on public.ask_answers for select
  using (
    hidden_at is null
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = ask_answers.user_id)
         or (b.blocked_id = auth.uid() and b.blocker_id = ask_answers.user_id)
    )
  );

-- Postgres/Supabase default a view to definer-style (owner) permission
-- checks unless told otherwise; this switches all four to check the
-- querying user's own RLS, which the policies above now make correct.
alter view public.visible_logs set (security_invoker = true);
alter view public.visible_curations set (security_invoker = true);
alter view public.visible_asks set (security_invoker = true);
alter view public.visible_ask_answers set (security_invoker = true);

-- The trigger functions below are never meant to be called directly (they
-- return `trigger` and only run via the trigger manager, so a direct RPC
-- call would error anyway) — revoking default PUBLIC execute is
-- defense-in-depth the linter asked for, not a behavior change.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_default_lists() from public, anon, authenticated;
revoke execute on function public.notify_ask_answered() from public, anon, authenticated;
revoke execute on function public.notify_new_follower() from public, anon, authenticated;
revoke execute on function public.auto_hide_reported() from public, anon, authenticated;

-- complete_curator_path had no guard at all: any signed-in user could call
-- it with any published path's id and instantly award themselves the badge
-- without ever touching a node. Replaced below (0009) with a per-node
-- advance flow that can't be skipped; drop the exploitable version now.
drop function if exists public.complete_curator_path(uuid);
