-- Palette — real curator-path progress, replacing the exploitable
-- complete_curator_path() dropped in 0008.
--
-- The brief's UI is a snake path with sequential nodes: tap a node, see its
-- required media, tap "Mark Module Complete," and only the *next* node
-- unlocks. Two RPCs implement that shape so a client can never skip ahead or
-- self-award the completion badge for a path it never engaged with.

-- Call when a user first opens a path (e.g. taps "Start"). Idempotent.
create or replace function public.start_curator_path(p_path_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.curator_paths where id = p_path_id and published) then
    raise exception 'path not found or not published';
  end if;

  insert into public.user_path_progress (user_id, path_id, current_node_position)
  values (auth.uid(), p_path_id, 1)
  on conflict (user_id, path_id) do nothing;
end;
$$;

revoke execute on function public.start_curator_path(uuid) from public, anon;
grant execute on function public.start_curator_path(uuid) to authenticated;

-- Call when the user marks a node's module complete. Only the node matching
-- the caller's current position can be completed — this is what makes
-- Node 3 in the brief's example genuinely "Locked" rather than merely
-- styled that way. Completing the last node sets completed_at and awards
-- the path's badge (if one exists) in the same transaction.
create or replace function public.advance_curator_path_node(p_path_id uuid, p_node_position integer)
returns table (current_node_position integer, completed boolean) language plpgsql security definer set search_path = public as $$
declare
  v_node_count integer;
  v_current integer;
  v_badge_id uuid;
begin
  select count(*) into v_node_count from public.curator_path_nodes where path_id = p_path_id;

  select upp.current_node_position into v_current
  from public.user_path_progress upp
  where upp.user_id = auth.uid() and upp.path_id = p_path_id
  for update;

  if v_current is null then
    raise exception 'call start_curator_path before advancing it';
  end if;

  if p_node_position <> v_current then
    raise exception 'node % is not the current node (currently on %)', p_node_position, v_current;
  end if;

  v_current := v_current + 1;

  update public.user_path_progress
  set current_node_position = v_current,
      completed_at = case when v_current > v_node_count then now() else completed_at end
  where user_id = auth.uid() and path_id = p_path_id;

  if v_current > v_node_count then
    select id into v_badge_id from public.badges where badges.path_id = p_path_id;
    if v_badge_id is not null then
      insert into public.user_badges (user_id, badge_id)
      values (auth.uid(), v_badge_id)
      on conflict do nothing;
    end if;
  end if;

  return query select v_current, (v_current > v_node_count);
end;
$$;

revoke execute on function public.advance_curator_path_node(uuid, integer) from public, anon;
grant execute on function public.advance_curator_path_node(uuid, integer) to authenticated;
