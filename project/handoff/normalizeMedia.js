/**
 * normalizeMedia — Palette
 *
 * Four providers, four unrelated JSON shapes. Everything downstream of this
 * file — cards, rows, search results, the library — speaks one language:
 * MediaItem. If a new provider is added later, it gets an adapter here and
 * nothing else in the app changes.
 *
 * Design constraint that shaped this file: every field except `id`, `title`
 * and `mediaType` is optional, because the providers genuinely omit them.
 * The UI is built to render an item with no cover, no creator and no year,
 * so the normalizer must never invent data to paper over a gap — it returns
 * undefined and lets the component show its designed fallback.
 */

/* ---------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * @typedef {'FILM'|'TV'|'BOOK'|'VINYL'|'CAST'|'EVENT'} MediaType
 *
 * @typedef {Object} MediaItem
 * @property {string}   id           Stable, provider-prefixed: "tmdb:603"
 * @property {string}   title
 * @property {MediaType} mediaType
 * @property {string}   source       Provider id, for attribution
 * @property {string=}  creator      Director, author, artist, publisher
 * @property {string=}  imageUrl     Poster, cover or sleeve
 * @property {string=}  backdropUrl  Wide art, where the provider has it
 * @property {number=}  releaseYear
 * @property {string=}  synopsis
 * @property {number=}  rating       Normalised to 0–5, never the raw scale
 * @property {number=}  ratingCount
 * @property {string=}  previewUrl   30s audio, where licensed
 * @property {string=}  externalUrl  Open on the provider
 * @property {string[]=} genres
 * @property {number=}  runtimeMins
 */

const TMDB_IMG = 'https://image.tmdb.org/t/p';

/** Providers use different scales; the UI only ever draws 0–5. */
const toFiveScale = (value, fromMax) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return Math.round((value / fromMax) * 5 * 10) / 10;
};

const yearFrom = (dateish) => {
  if (!dateish) return undefined;
  const y = parseInt(String(dateish).slice(0, 4), 10);
  return Number.isFinite(y) ? y : undefined;
};

/** Provider descriptions arrive with markup and boilerplate often enough. */
const cleanText = (raw) => {
  if (!raw) return undefined;
  const text = String(raw)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length ? text : undefined;
};

/** An empty string is not a value — collapse it so the UI shows a fallback. */
const clean = (v) => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
};

/* ---------------------------------------------------------------------------
 * Adapters — one per provider response shape
 * ------------------------------------------------------------------------- */

/** TMDB /search/movie and /movie/{id} */
export function fromTMDBMovie(r) {
  if (!r || !r.id) return null;
  return {
    id: `tmdb:movie:${r.id}`,
    source: 'tmdb',
    mediaType: 'FILM',
    title: clean(r.title || r.original_title) || 'Untitled',
    creator: clean(
      r.credits?.crew?.find((c) => c.job === 'Director')?.name
    ),
    imageUrl: r.poster_path ? `${TMDB_IMG}/w500${r.poster_path}` : undefined,
    backdropUrl: r.backdrop_path
      ? `${TMDB_IMG}/w1280${r.backdrop_path}`
      : undefined,
    releaseYear: yearFrom(r.release_date),
    synopsis: cleanText(r.overview),
    rating: toFiveScale(r.vote_average, 10),
    ratingCount: r.vote_count || undefined,
    genres: (r.genres || []).map((g) => g.name).filter(Boolean),
    runtimeMins: r.runtime || undefined,
    externalUrl: `https://www.themoviedb.org/movie/${r.id}`,
  };
}

/** TMDB /search/tv and /tv/{id} */
export function fromTMDBShow(r) {
  if (!r || !r.id) return null;
  return {
    id: `tmdb:tv:${r.id}`,
    source: 'tmdb',
    mediaType: 'TV',
    title: clean(r.name || r.original_name) || 'Untitled',
    creator: clean(
      r.created_by?.[0]?.name || r.networks?.[0]?.name
    ),
    imageUrl: r.poster_path ? `${TMDB_IMG}/w500${r.poster_path}` : undefined,
    backdropUrl: r.backdrop_path
      ? `${TMDB_IMG}/w1280${r.backdrop_path}`
      : undefined,
    releaseYear: yearFrom(r.first_air_date),
    synopsis: cleanText(r.overview),
    rating: toFiveScale(r.vote_average, 10),
    ratingCount: r.vote_count || undefined,
    genres: (r.genres || []).map((g) => g.name).filter(Boolean),
    externalUrl: `https://www.themoviedb.org/tv/${r.id}`,
  };
}

/** Spotify /v1/search?type=album — item shape from `albums.items[]` */
export function fromSpotifyAlbum(r) {
  if (!r || !r.id) return null;
  /* Spotify returns images largest-first; take the largest under ~800px. */
  const image =
    (r.images || []).find((i) => i.width && i.width <= 800) || r.images?.[0];
  return {
    id: `spotify:album:${r.id}`,
    source: 'spotify',
    mediaType: 'VINYL',
    title: clean(r.name) || 'Untitled',
    creator: clean((r.artists || []).map((a) => a.name).join(', ')),
    imageUrl: image?.url,
    releaseYear: yearFrom(r.release_date),
    genres: r.genres || [],
    externalUrl: r.external_urls?.spotify,
    /* Spotify removed preview_url from most responses in 2024 — we source
       previews from iTunes instead, so its absence here is expected. */
    previewUrl: r.preview_url || undefined,
  };
}

/** Google Books /volumes — item shape from `items[]` */
export function fromGoogleBook(r) {
  if (!r || !r.id) return null;
  const v = r.volumeInfo || {};
  /* Google's thumbnails default to http and a curl edge; both look wrong. */
  const img = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail;
  return {
    id: `google:book:${r.id}`,
    source: 'google',
    mediaType: 'BOOK',
    title: clean(v.title) || 'Untitled',
    creator: clean((v.authors || []).join(', ')),
    imageUrl: img
      ? img.replace(/^http:/, 'https:').replace(/&edge=curl/, '')
      : undefined,
    releaseYear: yearFrom(v.publishedDate),
    synopsis: cleanText(v.description),
    rating: toFiveScale(v.averageRating, 5),
    ratingCount: v.ratingsCount || undefined,
    genres: v.categories || [],
    externalUrl: v.infoLink,
  };
}

/** Open Library /search.json — item shape from `docs[]` */
export function fromOpenLibraryBook(r) {
  if (!r || !r.key) return null;
  return {
    id: `openlibrary:${String(r.key).replace(/^\/works\//, '')}`,
    source: 'openlibrary',
    mediaType: 'BOOK',
    title: clean(r.title) || 'Untitled',
    creator: clean(r.author_name?.[0]),
    imageUrl: r.cover_i
      ? `https://covers.openlibrary.org/b/id/${r.cover_i}-L.jpg`
      : undefined,
    releaseYear: r.first_publish_year || undefined,
    genres: (r.subject || []).slice(0, 4),
    externalUrl: `https://openlibrary.org${r.key}`,
  };
}

/** iTunes Search API — podcasts and albums, item shape from `results[]` */
export function fromAppleResult(r) {
  if (!r) return null;
  const isPodcast = r.kind === 'podcast' || r.wrapperType === 'track'
    ? r.kind === 'podcast'
    : r.collectionType === 'Podcast';
  const type = isPodcast ? 'CAST' : 'VINYL';
  const id = r.collectionId || r.trackId || r.artistId;
  if (!id) return null;
  return {
    id: `apple:${type.toLowerCase()}:${id}`,
    source: 'apple',
    mediaType: type,
    title: clean(r.collectionName || r.trackName) || 'Untitled',
    creator: clean(r.artistName),
    /* iTunes serves 100px by default; the URL pattern scales cleanly. */
    imageUrl: r.artworkUrl100
      ? String(r.artworkUrl100).replace(/\/\d+x\d+bb\./, '/600x600bb.')
      : undefined,
    releaseYear: yearFrom(r.releaseDate),
    synopsis: cleanText(r.longDescription || r.description),
    genres: r.primaryGenreName ? [r.primaryGenreName] : [],
    previewUrl: r.previewUrl || undefined,
    externalUrl: r.collectionViewUrl || r.trackViewUrl,
    runtimeMins: r.trackTimeMillis
      ? Math.round(r.trackTimeMillis / 60000)
      : undefined,
  };
}

/* ---------------------------------------------------------------------------
 * Entry points
 * ------------------------------------------------------------------------- */

const ADAPTERS = {
  'tmdb:movie': fromTMDBMovie,
  'tmdb:tv': fromTMDBShow,
  'spotify:album': fromSpotifyAlbum,
  'google:book': fromGoogleBook,
  'openlibrary:book': fromOpenLibraryBook,
  'apple:any': fromAppleResult,
};

/** Normalize one raw record. Returns null if it cannot be made sense of. */
export function normalizeMedia(raw, kind) {
  const adapter = ADAPTERS[kind];
  if (!adapter) return null;
  try {
    const item = adapter(raw);
    /* A record with no title is not renderable — drop rather than show a
       row that reads as broken. */
    return item && item.title ? item : null;
  } catch {
    return null;
  }
}

/** Normalize a provider's whole response, discarding unusable records. */
export function normalizeList(rawList, kind) {
  return (rawList || [])
    .map((r) => normalizeMedia(r, kind))
    .filter(Boolean);
}

/**
 * Merge results from several providers into one ranked list.
 *
 * Interleaves rather than concatenates, so a slow provider does not end up
 * entirely below the fold — the user sees a book, a film and an album in the
 * first three rows rather than twenty films.
 *
 * Deduplicates on title + creator, because the same album legitimately comes
 * back from both Spotify and Apple.
 */
export function mergeResults(lists) {
  const present = lists.filter((l) => l && l.length);
  const seen = new Set();
  const out = [];
  const longest = Math.max(0, ...present.map((l) => l.length));

  for (let i = 0; i < longest; i++) {
    for (const list of present) {
      const item = list[i];
      if (!item) continue;
      const key = `${item.title}|${item.creator || ''}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/**
 * Settle every provider independently.
 *
 * One provider timing out must never empty the screen, so this resolves with
 * both the results that arrived and the sources that failed — the UI reports
 * the gap ("Music unavailable") beside results that did land.
 *
 * @param {Record<string, Promise<MediaItem[]>>} jobs
 * @returns {Promise<{ items: MediaItem[], failed: string[] }>}
 */
export async function settleProviders(jobs) {
  const names = Object.keys(jobs);
  const settled = await Promise.allSettled(names.map((n) => jobs[n]));

  const lists = [];
  const failed = [];

  settled.forEach((res, i) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      lists.push(res.value);
    } else {
      failed.push(names[i]);
    }
  });

  return { items: mergeResults(lists), failed };
}
