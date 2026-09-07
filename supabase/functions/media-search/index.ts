/**
 * media-search — Palette
 *
 * Ported from project/handoff/COMPLIANCE.md §2 with no behavioral changes,
 * only the relative import path to the shared normalizer. See that file for
 * the reasoning behind each decision here (auth-gated, allSettled not all,
 * shared Postgres cache, no provider key ever reaching the client).
 *
 * Secrets (set via `supabase secrets set`, never committed):
 *   TMDB_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, GOOGLE_BOOKS_KEY
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { normalizeList, mergeResults, type MediaItem } from '../_shared/normalizeMedia.ts';

/* .trim() defensively: a trailing newline or space pasted into a dashboard
   secret field is a classic self-inflicted "invalid_client"/401 that looks
   exactly like a wrong key. Cheap to guard against, costs nothing if the
   value was already clean. */
const TMDB_KEY = Deno.env.get('TMDB_API_KEY')!.trim();
const SPOTIFY_ID = Deno.env.get('SPOTIFY_CLIENT_ID')!.trim();
const SPOTIFY_SEC = Deno.env.get('SPOTIFY_CLIENT_SECRET')!.trim();
const GOOGLE_KEY = Deno.env.get('GOOGLE_BOOKS_KEY')!.trim();

/* Plain btoa() throws "outside of the Latin1 range" if either credential
   contains any non-ASCII byte (e.g. a smart quote or icon-font glyph that
   rode along on a copy-paste) — turning a bad-credential problem into a
   confusing crash instead of a clean auth rejection. Encoding via UTF-8
   bytes first means a stray character degrades to a normal Spotify
   `invalid_client` response, which is at least diagnosable. */
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

/* Logged once per cold start. Lengths only, never values — lets a future
   debugging session confirm a secret is actually present and roughly the
   right shape (Spotify's id/secret are each 32 chars) via query_logs,
   without needing another live round-trip through the app to find out. */
console.log(
  'media-search booted. Secret lengths:',
  JSON.stringify({
    TMDB_API_KEY: TMDB_KEY.length,
    SPOTIFY_CLIENT_ID: SPOTIFY_ID.length,
    SPOTIFY_CLIENT_SECRET: SPOTIFY_SEC.length,
    GOOGLE_BOOKS_KEY: GOOGLE_KEY.length,
  })
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

/* Spotify's client-credentials token lasts an hour. Cache it in module scope
   so a warm instance is not re-authenticating on every search. */
let spotifyToken: { value: string; expires: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && spotifyToken.expires > Date.now() + 60_000) {
    return spotifyToken.value;
  }
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${toBase64(`${SPOTIFY_ID}:${SPOTIFY_SEC}`)}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`spotify auth ${res.status} ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  spotifyToken = {
    value: json.access_token,
    expires: Date.now() + json.expires_in * 1000,
  };
  return spotifyToken.value;
}

/* Each provider is wrapped so one failure cannot reject the whole search. */
const withTimeout = (p: Promise<Response>, ms = 6000): Promise<Response> =>
  Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);

async function searchTMDB(q: string, page = 1): Promise<MediaItem[]> {
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}`
    + `&query=${encodeURIComponent(q)}&page=${page}&include_adult=false`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) throw new Error(`tmdb ${res.status} ${(await res.text()).slice(0, 300)}`);
  const { results = [] } = await res.json();
  return [
    ...normalizeList(results.filter((r: any) => r.media_type === 'movie'), 'tmdb:movie'),
    ...normalizeList(results.filter((r: any) => r.media_type === 'tv'), 'tmdb:tv'),
  ];
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
    const names = ['tmdb', 'spotify', 'google', 'apple'];
    const settled = await Promise.allSettled([
      searchTMDB(query, page),
      searchSpotify(query),
      searchGoogleBooks(query),
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
