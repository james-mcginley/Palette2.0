-- Palette — moderation (report, block, auto-hide) and the visibility views
-- every feed/search/thread read must go through.
--
-- Ported from handoff/COMPLIANCE.md §1. `content_kind` covers every public
-- UGC surface: logs carry the review text, so a "review" report is a report
-- on a log row, not a separate table.

create type report_reason as enum (
  'spam', 'harassment', 'hate', 'sexual', 'violence',
  'copyright', 'misinformation', 'other'
);
create type report_status as enum ('pending', 'actioned', 'dismissed');
create type content_kind  as enum ('log', 'curation', 'ask', 'ask_answer', 'profile');

create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references auth.users(id) on delete cascade,
  content_kind  content_kind not null,
  content_id    uuid not null,
  author_id     uuid not null references auth.users(id) on delete cascade,
  reason        report_reason not null,
  detail        text check (char_length(detail) <= 1000),
  status        report_status not null default 'pending',
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  -- One report per person per item; re-reporting is noise, not signal.
  unique (reporter_id, content_kind, content_id)
);
alter table public.reports enable row level security;

create policy "insert own report" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "read own reports" on public.reports
  for select using (auth.uid() = reporter_id);

create table public.blocks (
  blocker_id  uuid not null references auth.users(id) on delete cascade,
  blocked_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;

create policy "manage own blocks" on public.blocks
  for all using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);
-- Deliberately no "read blocks about me" policy: you can't discover you've
-- been blocked, only that someone has (see visible_* views below).

-- Three distinct reporters is a strong enough signal to hide pending review.
-- The threshold counts *people*, not reports.
create or replace function public.auto_hide_reported()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(distinct reporter_id) into n
  from public.reports
  where content_kind = new.content_kind
    and content_id = new.content_id
    and status = 'pending';

  if n >= 3 then
    if new.content_kind = 'log' then
      update public.logs set hidden_at = now() where id = new.content_id;
    elsif new.content_kind = 'curation' then
      update public.curations set hidden_at = now() where id = new.content_id;
    elsif new.content_kind = 'ask' then
      update public.asks set hidden_at = now() where id = new.content_id;
    elsif new.content_kind = 'ask_answer' then
      update public.ask_answers set hidden_at = now() where id = new.content_id;
    end if;
  end if;
  return new;
end $$;

create trigger trg_auto_hide after insert on public.reports
for each row execute function public.auto_hide_reported();

-- Blocking is symmetric everywhere: a one-way block is a safety hole, since
-- the blocked user would still see the blocker's content and could respond
-- to it. Every feed, search result and thread reads through one of these.

create or replace view public.visible_logs as
select l.*
from public.logs l
where l.hidden_at is null
  and l.visibility = 'public'
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = l.user_id)
       or (b.blocked_id = auth.uid() and b.blocker_id = l.user_id)
  );

create or replace view public.visible_curations as
select c.*
from public.curations c
where c.hidden_at is null
  and c.visibility = 'public'
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = c.user_id)
       or (b.blocked_id = auth.uid() and b.blocker_id = c.user_id)
  );

create or replace view public.visible_asks as
select a.*
from public.asks a
where a.hidden_at is null
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = a.user_id)
       or (b.blocked_id = auth.uid() and b.blocker_id = a.user_id)
  );

create or replace view public.visible_ask_answers as
select aa.*
from public.ask_answers aa
where aa.hidden_at is null
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = aa.user_id)
       or (b.blocked_id = auth.uid() and b.blocker_id = aa.user_id)
  );
