/**
 * media-search — Palette
 *
 * Ported from project/handoff/COMPLIANCE.md §2 with no behavioral changes,
 * only the relative import path to the shared normalizer. See that file for
 * the reasoning behind each decision here (auth-gated, allSettled not all,
 * shared Postgres cache, no provider key ever reaching the client).
 *
 * Secrets (set via the Supabase dashboard or `supabase secrets set`, never
 * committed): TMDB_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET,
 * GOOGLE_BOOKS_KEY — read once in _shared/providerAuth.ts.
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { normalizeList, mergeResults, type MediaItem } from '../_shared/normalizeMedia.ts';
import { TMDB_KEY, GOOGLE_KEY, getSpotifyToken, withTimeout } from '../_shared/providerAuth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  // supabase-js attaches `apikey` and `x-client-info` to every request,
  // not just `authorization`/`content-type` — omitting them here doesn't
  // break native or curl (neither enforces CORS), but a browser silently
  // fails preflight and never sends the real request at all.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripHtml = (raw: string): string =>
  raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/* TMDB's own overview is often thin or missing for older/obscure titles.
   Backfilling from TVmaze (TV) and Wikipedia (film) is a nice-to-have, not
   core, so it's capped at 3 enrichment calls per medium and never allowed to
   fail the search — a timeout or a bad match just leaves the item exactly as
   TMDB returned it. Never overwrites a synopsis TMDB already provided. */
async function enrichTvSynopsis(item: MediaItem): Promise<MediaItem> {
  try {
    const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(item.title)}`;
    const res = await withTimeout(fetch(url), 3000);
    if (!res.ok) return item;
    const results = await res.json();
    const summary = results?.[0]?.show?.summary;
    const synopsis = summary ? stripHtml(summary) : undefined;
    return synopsis ? { ...item, synopsis } : item;
  } catch {
    return item;
  }
}

async function enrichFilmSynopsis(item: MediaItem): Promise<MediaItem> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title)}`;
    const res = await withTimeout(fetch(url), 3000);
    if (!res.ok) return item;
    const json = await res.json();
    return json.extract ? { ...item, synopsis: stripHtml(json.extract) } : item;
  } catch {
    return item;
  }
}

async function enrichMissingSynopses(items: MediaItem[]): Promise<MediaItem[]> {
  const ENRICH_BUDGET = 3;
  let tvBudget = ENRICH_BUDGET;
  let filmBudget = ENRICH_BUDGET;
  return Promise.all(items.map((item) => {
    if (item.synopsis) return item;
    if (item.mediaType === 'TV' && tvBudget-- > 0) return enrichTvSynopsis(item);
    if (item.mediaType === 'FILM' && filmBudget-- > 0) return enrichFilmSynopsis(item);
    return item;
  }));
}

async function searchTMDB(q: string, page = 1): Promise<MediaItem[]> {
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}`
    + `&query=${encodeURIComponent(q)}&page=${page}&include_adult=false`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) throw new Error(`tmdb ${res.status} ${(await res.text()).slice(0, 300)}`);
  const { results = [] } = await res.json();
  const items = [
    ...normalizeList(results.filter((r: any) => r.media_type === 'movie'), 'tmdb:movie'),
    ...normalizeList(results.filter((r: any) => r.media_type === 'tv'), 'tmdb:tv'),
  ];
  return enrichMissingSynopses(items);
}

async function searchSpotify(q: string): Promise<MediaItem[]> {
  const token = await getSpotifyToken();
  const url = `https://api.spotify.com/v1/search?type=album&limit=8`
    + `&q=${encodeURIComponent(q)}`;
  const res = await withTimeout(
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  );
  if (!res.ok) throw new Error(`spotify ${res.status} ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return normalizeList(json.albums?.items ?? [], 'spotify:album');
}

async function searchGoogleBooks(q: string): Promise<MediaItem[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?key=${GOOGLE_KEY}`
    + `&q=${encodeURIComponent(q)}&maxResults=8&country=GB`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) throw new Error(`google ${res.status} ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return normalizeList(json.items ?? [], 'google:book');
}

/* Keyless, and runs alongside Google Books rather than only after it fails —
   sequential fallback would double search latency for a case that's already
   fast, and Open Library's open catalog frequently covers books Google's
   commercial one has thin or no data for. Both sources' results merge
   together (mergeResults already dedupes on title+creator), so a book
   findable in either shows up once. */
async function searchOpenLibrary(q: string): Promise<MediaItem[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) throw new Error(`openlibrary ${res.status} ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return normalizeList(json.docs ?? [], 'openlibrary:book');
}

async function searchApple(q: string): Promise<MediaItem[]> {
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
    const names = ['tmdb', 'spotify', 'google', 'openlibrary', 'apple'];
    const settled = await Promise.allSettled([
      searchTMDB(query, page),
      searchSpotify(query),
      searchGoogleBooks(query),
      searchOpenLibrary(query),
      searchApple(query),
    ]);

    const lists: MediaItem[][] = [];
    const failed: string[] = [];
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') lists.push(r.value);
      else { failed.push(names[i]); console.error(names[i], (r.reason as Error)?.message); }
    });

    const payload = { items: mergeResults(lists), failed, page };

    /* A partial-failure payload (a bad key, a transient outage) must not sit
       in the cache for the full 24h TTL — that would make a just-fixed key,
       or a provider recovering from an outage, look broken to every user for
       a full day. Only a fully successful result earns the long TTL. */
    const ttlMs = failed.length > 0 ? 60_000 : 86_400_000;
    await supabase.from('search_cache').upsert({
      key: cacheKey,
      payload,
      expires_at: new Date(Date.now() + ttlMs).toISOString(),
    });

    return json(payload);
  } catch (err) {
    console.error(err);
    /* Never leak provider errors or key material to the client. */
    return json({ error: 'search_failed' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
