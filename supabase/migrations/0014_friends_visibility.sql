-- Palette — actually enforce the 'friends' visibility tier.
--
-- 0002's own comment says "Public/friends visibility is enforced by the
-- `visible_logs` view", but 0005's view (and 0008's matching RLS policy)
-- only ever filtered on `visibility = 'public'` — a 'friends'-visibility log
-- was reachable by nobody but its author, making the tier a silent no-op.
-- Needed now because the friend activity feed (Feed/Friends tabs) is
-- exactly the surface 'friends' visibility was designed for: visible to the
-- people who follow you, not to the general public.
--
-- Same gap, same fix, for curations — it carries the identical `visibility`
-- enum with the identical intent.

alter policy "public logs are readable by non-blocked users"
  on public.logs
  using (
    hidden_at is null
    and (
      visibility = 'public'
      or (
        visibility = 'friends'
        and exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.followee_id = logs.user_id
        )
      )
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = logs.user_id)
         or (b.blocked_id = auth.uid() and b.blocker_id = logs.user_id)
    )
  );

alter policy "public curations are readable by non-blocked users"
  on public.curations
  using (
    hidden_at is null
    and (
      visibility = 'public'
      or (
        visibility = 'friends'
        and exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.followee_id = curations.user_id
        )
      )
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = curations.user_id)
         or (b.blocked_id = auth.uid() and b.blocker_id = curations.user_id)
    )
  );

-- With RLS now expressing the full "public, or friends-if-following, or
-- your own (via the sibling owner policy), and never a blocked pair" rule,
-- the view's own WHERE clause was only ever restating it — now it would be
-- restating it *incorrectly* (still 'public'-only) if left alone. Since both
-- views are security_invoker, RLS is the actual enforcement either way;
-- collapsing the view to a plain select keeps one copy of the rule instead
-- of two that can drift, as just happened.
create or replace view public.visible_logs as
select * from public.logs;
alter view public.visible_logs set (security_invoker = true);

create or replace view public.visible_curations as
select * from public.curations;
alter view public.visible_curations set (security_invoker = true);
