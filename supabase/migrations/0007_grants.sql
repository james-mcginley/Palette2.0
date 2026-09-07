-- Palette — role grants.
--
-- A fresh Supabase project's dashboard-created tables get these grants
-- automatically; tables created by a raw migration (as all of the above are)
-- do not. Row Level Security is what actually restricts access — these
-- grants just let the anon/authenticated Postgres roles reach the tables at
-- all, the same way Supabase's own tooling would have set them up.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.follows,
  public.logs,
  public.lists,
  public.list_items,
  public.curations,
  public.curation_items,
  public.user_path_progress,
  public.asks,
  public.ask_answers,
  public.notifications,
  public.reports,
  public.blocks,
  public.search_cache
to authenticated;

grant select on
  public.curator_paths,
  public.curator_path_nodes,
  public.badges,
  public.user_badges,
  public.visible_logs,
  public.visible_curations,
  public.visible_asks,
  public.visible_ask_answers
to anon, authenticated;

grant select on public.profiles, public.follows to anon;

grant execute on function public.complete_curator_path(uuid) to authenticated;

-- Sequences/defaults use gen_random_uuid(), so there are no owned sequences
-- to grant usage on.
