-- Palette — expose other users' curation items to the Discover feed.
--
-- 0008 gave `curations` a "public, non-hidden, non-blocked" SELECT policy and
-- built `visible_curations` on top of it — but `curation_items` was never
-- given an equivalent policy. Its only policy (0003, "users manage items in
-- their own curations") is owner-scoped for every action including SELECT,
-- so a public curation's row is visible while its contents are not: exactly
-- the gap that stopped the Discover collection tile (three fanned covers)
-- from rendering anyone's curation but the viewer's own.
--
-- Mirrors 0008's fix pattern: a real RLS policy expressing "readable when
-- the parent curation is visible", then a security_invoker view over it so
-- the view enforces that policy rather than bypassing RLS.

create policy "items of visible curations are readable"
  on public.curation_items for select
  using (
    exists (
      select 1 from public.visible_curations vc where vc.id = curation_items.curation_id
    )
  );

create or replace view public.visible_curation_items as
select ci.*
from public.curation_items ci
where exists (
  select 1 from public.visible_curations vc where vc.id = ci.curation_id
);
alter view public.visible_curation_items set (security_invoker = true);

grant select on public.visible_curation_items to anon, authenticated;
