/**
 * media-detail — Palette
 *
 * Fetches one MediaItem by its provider-prefixed id (e.g. "tmdb:movie:603"),
 * so MediaDetailScreen can open from a badge, a curator-path node, or a
 * library item that only carries a media_id — not just from a fresh search
 * result or an existing log, both of which already carry a full snapshot.
 *
 * Deliberately unlike media-search: no shared cache table here yet (detail
 * views are far less "thundering herd"-prone than a popular search term),
 * and no allSettled fan-out — a detail lookup only ever calls the one
 * provider the id belongs to, so there's nothing to settle independently.
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  fromTMDBMovie,
  fromTMDBShow,
  fromSpotifyAlbum,
  fromGoogleBook,
  fromAppleResult,
  type MediaItem,
} from '../_shared/normalizeMedia.ts';
import { TMDB_KEY, GOOGLE_KEY, getSpotifyToken, withTimeout } from '../_shared/providerAuth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  // supabase-js attaches `apikey` and `x-client-info` to every request,
  // not just `authorization`/`content-type` — omitting them here doesn't
  // break native or curl (neither enforces CORS), but a browser silently
  // fails preflight and never sends the real request at all.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* Every id normalizeMedia.ts produces is "source:kind:providerId" — except
   Open Library's, which is "openlibrary:workKey" (two segments, no kind). */
function parseMediaId(mediaId: string): { source: string; kind?: string; id: string } {
  const [source, ...rest] = mediaId.split(':');
  if (source === 'openlibrary') return { source, id: rest.join(':') };
  const [kind, ...idParts] = rest;
  return { source, kind, id: idParts.join(':') };
}

async function detailTMDBMovie(id: string): Promise<MediaItem | null> {
  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&append_to_response=credits`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) return null;
  return fromTMDBMovie(await res.json());
}

async function detailTMDBShow(id: string): Promise<MediaItem | null> {
  const url = `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) return null;
  return fromTMDBShow(await res.json());
}

async function detailSpotifyAlbum(id: string): Promise<MediaItem | null> {
  const token = await getSpotifyToken();
  const url = `https://api.spotify.com/v1/albums/${id}`;
  const res = await withTimeout(fetch(url, { headers: { Authorization: `Bearer ${token}` } }));
  if (!res.ok) return null;
  return fromSpotifyAlbum(await res.json());
}

async function detailGoogleBook(id: string): Promise<MediaItem | null> {
  const url = `https://www.googleapis.com/books/v1/volumes/${id}?key=${GOOGLE_KEY}`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) return null;
  return fromGoogleBook(await res.json());
}

/* Open Library's work detail endpoint returns a materially different shape
   than its search docs (authors are references needing a second lookup,
   description is a string-or-{value} union) — mapped directly here rather
   than force-fitting into fromOpenLibraryBook, which expects a search doc. */
async function detailOpenLibrary(workKey: string): Promise<MediaItem | null> {
  const url = `https://openlibrary.org/works/${workKey}.json`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) return null;
  const w = await res.json();
  const description = typeof w.description === 'string' ? w.description : w.description?.value;
  return {
    id: `openlibrary:${workKey}`,
    source: 'openlibrary',
    mediaType: 'BOOK',
    title: w.title || 'Untitled',
    imageUrl: w.covers?.[0] ? `https://covers.openlibrary.org/b/id/${w.covers[0]}-L.jpg` : undefined,
    synopsis: description ? String(description).slice(0, 2000) : undefined,
    genres: (w.subjects || []).slice(0, 4),
    externalUrl: `https://openlibrary.org/works/${workKey}`,
  };
}

async function detailApple(id: string): Promise<MediaItem | null> {
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`;
  const res = await withTimeout(fetch(url));
  if (!res.ok) return null;
  const json = await res.json();
  const result = json.results?.[0];
  return result ? fromAppleResult(result) : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { mediaId } = await req.json();
    if (typeof mediaId !== 'string' || !mediaId) return json({ error: 'mediaId required' }, 400);

    const { source, kind, id } = parseMediaId(mediaId);

    let item: MediaItem | null = null;
    try {
      if (source === 'tmdb' && kind === 'movie') item = await detailTMDBMovie(id);
      else if (source === 'tmdb' && kind === 'tv') item = await detailTMDBShow(id);
      else if (source === 'spotify' && kind === 'album') item = await detailSpotifyAlbum(id);
      else if (source === 'google' && kind === 'book') item = await detailGoogleBook(id);
      else if (source === 'openlibrary') item = await detailOpenLibrary(id);
      else if (source === 'apple') item = await detailApple(id);
    } catch (err) {
      console.error('media-detail', mediaId, (err as Error)?.message);
    }

    if (!item) return json({ error: 'not_found' }, 404);
    return json({ item });
  } catch (err) {
    console.error(err);
    return json({ error: 'detail_failed' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
