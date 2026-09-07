-- Palette — log_media(): the actual core-loop write.
--
-- PLAN.md Phase 1's "done when" criterion requires that logging something
-- makes it appear in the Library instantly, not just in the Feed. Doing that
-- as two separate client-side inserts (logs, then list_items) is exactly the
-- kind of thing that goes inconsistent under the offline mutation queue —
-- one call can succeed and the retried call fail, or replay twice. Wrapping
-- both writes in one Postgres function makes it a single atomic unit of work
-- for the client's offline queue to persist and replay.

create or replace function public.log_media(
  p_media_id text,
  p_media_type media_type,
  p_media_snapshot jsonb,
  p_rating numeric default null,
  p_review text default null,
  p_visibility visibility default 'public',
  p_logged_on date default current_date
)
returns public.logs
language plpgsql security definer set search_path = public as $$
declare
  v_log public.logs;
  v_consumed_list_id uuid;
begin
  insert into public.logs (user_id, media_id, media_type, media_snapshot, rating, review, visibility, logged_on)
  values (auth.uid(), p_media_id, p_media_type, p_media_snapshot, p_rating, p_review, p_visibility, p_logged_on)
  returning * into v_log;

  -- Every profile gets a smart "Consumed" list on signup (0002); logging
  -- something is, definitionally, consuming it. If that list is somehow
  -- missing (a profile created before 0002, a bad migration order) the log
  -- itself still succeeds — the library entry is a courtesy, not the point.
  select id into v_consumed_list_id
  from public.lists
  where user_id = auth.uid() and is_smart and title = 'Consumed'
  limit 1;

  if v_consumed_list_id is not null then
    insert into public.list_items (list_id, media_id, media_type, media_snapshot, status, consumed_at)
    values (v_consumed_list_id, p_media_id, p_media_type, p_media_snapshot, 'consumed', now())
    on conflict (list_id, media_id) do update
      set status = 'consumed',
          consumed_at = now(),
          media_snapshot = excluded.media_snapshot;
  end if;

  return v_log;
end;
$$;

revoke execute on function public.log_media(text, media_type, jsonb, numeric, text, visibility, date) from public, anon;
grant execute on function public.log_media(text, media_type, jsonb, numeric, text, visibility, date) to authenticated;
