-- Palette — recommendation requests ("Asks") and the Mailbox.
--
-- The Mailbox is deliberately not a notification feed of likes/counts (the
-- brief is explicit that Palette drops like-counting as a social-competition
-- mechanic). It carries only things a person would want to open: a reply to
-- their Ask, a friend follow, a badge earned, a path node unlocking.

create type ask_status as enum ('open', 'answered', 'closed');

create table public.asks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  question     text not null check (char_length(question) <= 500),
  media_type   media_type,             -- optional filter, e.g. "recommend me a FILM"
  status       ask_status not null default 'open',
  hidden_at    timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.asks enable row level security;

create policy "users manage their own asks"
  on public.asks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.ask_answers (
  id             uuid primary key default gen_random_uuid(),
  ask_id         uuid not null references public.asks(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  body           text not null check (char_length(body) <= 1000),
  media_id       text,
  media_type     media_type,
  media_snapshot jsonb,
  hidden_at      timestamptz,
  created_at     timestamptz not null default now()
);
alter table public.ask_answers enable row level security;

create policy "users manage their own answers"
  on public.ask_answers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Answering someone else's Ask requires the Ask to exist and be open; reads
-- of answers to a given Ask go through `visible_ask_answers` (0005), which
-- also strips answers on hidden/blocked content.
create policy "anyone can answer an open ask"
  on public.ask_answers for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.asks a where a.id = ask_id and a.status = 'open')
  );

create type notification_kind as enum (
  'ask_answered', 'new_follower', 'badge_earned', 'path_node_unlocked', 'report_resolved'
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       notification_kind not null,
  payload    jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create policy "users read their own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "users mark their own notifications read"
  on public.notifications for update using (auth.uid() = user_id);
-- Notifications are written server-side (triggers / edge functions using the
-- service role), never inserted directly by a client.

create or replace function public.notify_ask_answered()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ask_owner uuid;
begin
  select user_id into v_ask_owner from public.asks where id = new.ask_id;
  if v_ask_owner is not null and v_ask_owner <> new.user_id then
    insert into public.notifications (user_id, kind, payload)
    values (v_ask_owner, 'ask_answered', jsonb_build_object('ask_id', new.ask_id, 'answer_id', new.id, 'from', new.user_id));

    update public.asks set status = 'answered' where id = new.ask_id and status = 'open';
  end if;
  return new;
end;
$$;

create trigger on_ask_answered
  after insert on public.ask_answers
  for each row execute function public.notify_ask_answered();

create or replace function public.notify_new_follower()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, payload)
  values (new.followee_id, 'new_follower', jsonb_build_object('follower_id', new.follower_id));
  return new;
end;
$$;

create trigger on_new_follower
  after insert on public.follows
  for each row execute function public.notify_new_follower();
