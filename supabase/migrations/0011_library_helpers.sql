-- Palette — small helpers for the Library screen.

-- Save something to "Want" without logging it (the brief's "Save to My
-- List" destination, distinct from "Publish to Feed" / logging). Upsert
-- rather than insert: re-saving an already-consumed item shouldn't demote it
-- back to "want".
create or replace function public.add_to_want_list(
  p_media_id text,
  p_media_type media_type,
  p_media_snapshot jsonb
)
returns public.list_items
language plpgsql security definer set search_path = public as $$
declare
  v_want_list_id uuid;
  v_item public.list_items;
begin
  select id into v_want_list_id
  from public.lists
  where user_id = auth.uid() and is_smart and title = 'Want'
  limit 1;

  if v_want_list_id is null then
    raise exception 'no smart Want list for this user';
  end if;

  insert into public.list_items (list_id, media_id, media_type, media_snapshot, status)
  values (v_want_list_id, p_media_id, p_media_type, p_media_snapshot, 'want')
  on conflict (list_id, media_id) do update
    set media_snapshot = excluded.media_snapshot
  returning * into v_item;

  return v_item;
end;
$$;

revoke execute on function public.add_to_want_list(text, media_type, jsonb) from public, anon;
grant execute on function public.add_to_want_list(text, media_type, jsonb) to authenticated;
