# Palette — Security & Compliance Blueprint

Pre-MVP. Covers the three things most likely to fail App Store review or
create liability later.

---

## 1. Moderation — Guideline 1.2 (UGC)

Apple rejects any app with public user content that lacks **all four** of:
report, block, filter, and a stated 24-hour response commitment.

Palette has three UGC surfaces: public curations, reviews, and Asks answers.

### Schema

```sql
create type report_reason as enum (
  'spam', 'harassment', 'hate', 'sexual', 'violence',
  'copyright', 'misinformation', 'other'
);
create type report_status as enum ('pending', 'actioned', 'dismissed');
create type content_kind  as enum ('curation', 'review', 'ask', 'answer', 'profile');

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

create table public.blocks (
  blocker_id  uuid not null references auth.users(id) on delete cascade,
  blocked_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Set by a moderator or by the auto-hide trigger below.
alter table public.curations add column hidden_at timestamptz;
alter table public.reviews   add column hidden_at timestamptz;
```

### RLS

```sql
alter table public.reports enable row level security;
alter table public.blocks  enable row level security;

-- You can file a report and see your own. You cannot read anyone else's,
-- or discover that you have been reported.
create policy "insert own report" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "read own reports" on public.reports
  for select using (auth.uid() = reporter_id);

create policy "manage own blocks" on public.blocks
  for all using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);
```

### Blocking must be symmetric

A one-way block is a safety hole: the blocked user still sees the blocker's
content and can respond to it. Filter both directions everywhere.

```sql
create or replace view public.visible_curations as
select c.*
from public.curations c
where c.hidden_at is null
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = c.author_id)
       or (b.blocked_id = auth.uid() and b.blocker_id = c.author_id)
  );
```

Read every feed, search result and Ask thread through views like this. A
single query that forgets the block filter is the bug that gets you a
one-star review about harassment.

### Auto-hide

Three distinct reporters is a strong enough signal to hide pending review.
The threshold counts *people*, not reports.

```sql
create or replace function public.auto_hide_reported()
returns trigger language plpgsql security definer as $$
declare n int;
begin
  select count(distinct reporter_id) into n
  from public.reports
  where content_kind = new.content_kind
    and content_id = new.content_id
    and status = 'pending';

  if n >= 3 then
    if new.content_kind = 'curation' then
      update public.curations set hidden_at = now() where id = new.content_id;
    elsif new.content_kind = 'review' then
      update public.reviews set hidden_at = now() where id = new.content_id;
    end if;
  end if;
  return new;
end $$;

create trigger trg_auto_hide after insert on public.reports
for each row execute function public.auto_hide_reported();
```

### UI flow

**Entry point.** A `⋯` on every public curation, review and answer. Not a
long-press — undiscoverable, and reviewers check for this.

**Report** opens an action sheet:
1. Reason list (the enum above, in plain words: "Spam", "Harassment or
   bullying", "Hate speech", …)
2. Optional detail field
3. Confirmation that states the commitment: *"Thanks. We review reports within
   24 hours."* — the sentence Apple looks for.

**Block** is a destructive-styled row in the same sheet. Confirm once, and say
what it does: *"You won't see James's logs or lists, and he won't see yours."*
Then remove their content from view immediately — an optimistic update, so it
is gone before the round trip.

**Blocked list** lives in Settings → Privacy, with unblock. Apple checks that
a block can be undone.

**Also required:** a Terms of Use link with an EULA that states there is zero
tolerance for objectionable content. Apple's 1.2 checklist is explicit about
this and rejects for its absence.

---

## 2. Edge function — secure API routing

The rule: **no provider key in the bundle**. The client calls this; this calls
the providers.

```ts
// supabase/functions/media-search/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { normalizeList, mergeResults } from '../_shared/normalizeMedia.ts';

const TMDB_KEY     = Deno.env.get('TMDB_API_KEY')!;
const SPOTIFY_ID   = Deno.env.get('SPOTIFY_CLIENT_ID')!;
const SPOTIFY_SEC  = Deno.env.get('SPOTIFY_CLIENT_SECRET')!;
const GOOGLE_KEY   = Deno.env.get('GOOGLE_BOOKS_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

/* Spotify's client-credentials token lasts an hour. Cache it in module scope
   so a warm instance is not re-authenticating on every search. */
let spotifyToken: { value: string; expires: number } | null = null;

async function getSpotifyToken() {
  if (spotifyToken && spotifyToken.expires > Date.now() + 60_000) {
    return spotifyToken.value;
  }
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${SPOTIFY_ID}:${SPOTIFY_SEC}`)}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`spotify auth ${res.status}`);
  const json = await res.json();
  spotifyToken = {
    value: json.access_token,
    expires: Date.now() + json.expires_in * 1000,
  };
  return spotifyToken.value;
}

/* Each provider is wrapped so one failure cannot reject the whole search. */
const withTimeout = (p: Promise<Response>, ms = 6000) =>
  Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);

async function searchTMDB(q: string, page = 1) {
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}`
    + `&query=${encodeURIComponent(q)}&page=${page}&include_adult=false`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) throw new Error(`tmdb ${res.status}`);
  const { results = [] } = await res.json();
  return [
    ...normalizeList(results.filter((r: any) => r.media_type === 'movie'), 'tmdb:movie'),
    ...normalizeList(results.filter((r: any) => r.media_type === 'tv'), 'tmdb:tv'),
  ];
}

async function searchSpotify(q: string) {
  const token = await getSpotifyToken();
  const url = `https://api.spotify.com/v1/search?type=album&limit=8`
    + `&q=${encodeURIComponent(q)}`;
  const res = await withTimeout(
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  );
  if (!res.ok) throw new Error(`spotify ${res.status}`);
  const json = await res.json();
  return normalizeList(json.albums?.items ?? [], 'spotify:album');
}

async function searchGoogleBooks(q: string) {
  const url = `https://www.googleapis.com/books/v1/volumes?key=${GOOGLE_KEY}`
    + `&q=${encodeURIComponent(q)}&maxResults=8&country=GB`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) throw new Error(`google ${res.status}`);
  const json = await res.json();
  return normalizeList(json.items ?? [], 'google:book');
}

async function searchApple(q: string) {
  const url = `https://itunes.apple.com/search?media=podcast&limit=6`
    + `&term=${encodeURIComponent(q)}`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) throw new Error(`apple ${res.status}`);
  const json = await res.json();
  return normalizeList(json.results ?? [], 'apple:any');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    /* Authenticated callers only — otherwise this is an open proxy to our
       paid quota. */
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { q, page = 1 } = await req.json();
    const query = String(q ?? '').trim();
    if (query.length < 2) return json({ items: [], failed: [] });

    /* Shared cache: a thousand users searching the same title is one round
       of provider calls, not a thousand. */
    const cacheKey = `${query.toLowerCase()}:${page}`;
    const { data: cached } = await supabase
      .from('search_cache')
      .select('payload')
      .eq('key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (cached) return json(cached.payload);

    /* allSettled, not all: a provider that is down degrades the result,
       it does not fail the request. */
    const names = ['tmdb', 'spotify', 'google', 'apple'];
    const settled = await Promise.allSettled([
      searchTMDB(query, page),
      searchSpotify(query),
      searchGoogleBooks(query),
      searchApple(query),
    ]);

    const lists: any[] = [];
    const failed: string[] = [];
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') lists.push(r.value);
      else { failed.push(names[i]); console.error(names[i], r.reason?.message); }
    });

    const payload = { items: mergeResults(lists), failed, page };

    await supabase.from('search_cache').upsert({
      key: cacheKey,
      payload,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });

    return json(payload);
  } catch (err) {
    console.error(err);
    /* Never leak provider errors or key material to the client. */
    return json({ error: 'search_failed' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
```

**Cache table:**

```sql
create table public.search_cache (
  key         text primary key,
  payload     jsonb not null,
  expires_at  timestamptz not null
);
create index on public.search_cache (expires_at);
-- pg_cron nightly: delete from search_cache where expires_at < now();
```

**Client call — no key anywhere:**

```ts
const { data, error } = await supabase.functions.invoke('media-search', {
  body: { q: query, page },
});
// data: { items: MediaItem[], failed: string[], page: number }
```

**Set secrets:**

```bash
supabase secrets set TMDB_API_KEY=… SPOTIFY_CLIENT_ID=… \
  SPOTIFY_CLIENT_SECRET=… GOOGLE_BOOKS_KEY=…
```

Never in `.env` committed to the repo. Rotate if one ever lands in git history —
scrubbing the commit is not enough, the key is already scraped.

---

## 3. Auth scopes — data minimisation

The principle: **request nothing you cannot name a use for.** Every extra scope
is a consent prompt that costs you sign-ups and a GDPR obligation that costs
you later.

### Apple

Request **name and email only**.

```ts
await supabase.auth.signInWithIdToken({
  provider: 'apple',
  token: identityToken,
});
// expo-apple-authentication:
// requestedScopes: [FULL_NAME, EMAIL]
```

Two Apple-specific things that will bite you:

**Name and email arrive exactly once** — on the very first authorisation, never
again. If you don't persist them on that first callback, they are gone unless
the user removes the app from their Apple ID settings. Write them to `profiles`
immediately.

**Private Relay.** Users can hide their real address; you get
`…@privaterelay.appleid.com`. That address works for transactional mail only if
you register your sending domain with Apple. Assume you cannot reach users by
email and design accordingly — no email-only recovery path.

### Google

Request **`openid`, `email`, `profile`** — nothing more.

```ts
await supabase.auth.signInWithIdToken({
  provider: 'google',
  token: idToken,
});
```

Specifically do **not** request `https://www.googleapis.com/auth/books` or any
Drive/Contacts scope. Palette reads the *public* Books API with a server key;
it never needs a user's own library. Sensitive scopes trigger Google's security
assessment — weeks of review and an annual audit fee — for a feature you don't
have.

### What to store

| Field | Store? | Why |
|---|---|---|
| Provider user id | Yes | The join key. Unavoidable. |
| Email | Yes | Account recovery, transactional mail. |
| Display name | Yes | Shown on their profile. |
| Avatar URL | Reference only | Link it; don't copy the image to your storage. |
| Birthday, gender, phone, contacts | **No** | Never requested, so never held. |
| IP / precise location | **No** | Events are city-level, from a user-set city. |

```sql
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  handle       text unique,
  bio          text check (char_length(bio) <= 300),
  avatar_url   text,
  city         text,              -- user-entered, not device GPS
  is_private   boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;
```

### Privacy nutrition label

Declare honestly — a mismatch between the label and observed behaviour is a
rejection, and Apple does check:

- **Linked to you:** Email, Name, User ID, User Content (logs, reviews, lists)
- **Not collected:** Location, Contacts, Browsing history, Identifiers for
  tracking

If you add analytics later, this changes and the label must be updated in the
same submission.

### GDPR obligations you actually have

1. **Access** — the export flow already in the prototype covers this. Make it
   machine-readable (JSON), not a PDF.
2. **Erasure** — the delete-account flow in `ARCHITECTURE.md` §6.
3. **Portability** — same export.
4. **Lawful basis** — contract for the account, legitimate interest for
   recommendations. You do not need consent banners for either, which is why
   avoiding analytics and tracking scopes is worth real money.

---

## Pre-submission checklist

- [ ] Report flow on every public surface, with the 24-hour commitment stated
- [ ] Block, symmetric, with an unblock list in Settings
- [ ] Terms of Use with the zero-tolerance clause, linked in-app
- [ ] Delete account, in-app, cascading
- [ ] Data export, JSON
- [ ] Privacy policy URL, live before submission
- [ ] Zero provider keys in the bundle — grep the build output to confirm
- [ ] Minimum scopes only on both providers
- [ ] Privacy nutrition label matches observed behaviour
- [ ] Attribution screen reachable from Settings
- [ ] Demo account credentials in the review notes
