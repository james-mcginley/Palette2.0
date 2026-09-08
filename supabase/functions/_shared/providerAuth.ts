/**
 * providerAuth — Palette
 *
 * Shared secret-reading and Spotify token exchange for every edge function
 * that talks to a third-party media API. Split out of media-search after the
 * Spotify credential debugging session that motivated the .trim() and
 * UTF-8-safe base64 fixes below — with two functions each reading
 * Deno.env.get() independently, a fix applied to one and not the other is
 * exactly the kind of drift that produces a "works in search, broken in
 * detail" bug report. One copy of this logic, used everywhere.
 */

/* .trim() defensively: a trailing newline or space pasted into a dashboard
   secret field is a classic self-inflicted "invalid_client"/401 that looks
   exactly like a wrong key. Cheap to guard against, costs nothing if the
   value was already clean. */
export const TMDB_KEY = Deno.env.get('TMDB_API_KEY')!.trim();
export const SPOTIFY_ID = Deno.env.get('SPOTIFY_CLIENT_ID')!.trim();
export const SPOTIFY_SEC = Deno.env.get('SPOTIFY_CLIENT_SECRET')!.trim();
export const GOOGLE_KEY = Deno.env.get('GOOGLE_BOOKS_KEY')!.trim();

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

/* Spotify's client-credentials token lasts an hour. Cached in module scope
   so a warm instance is not re-authenticating on every call — shared across
   every function that imports this module within the same isolate. */
let spotifyToken: { value: string; expires: number } | null = null;

export async function getSpotifyToken(): Promise<string> {
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

/* Every provider call is wrapped so one slow provider cannot hang a whole
   request. */
export const withTimeout = (p: Promise<Response>, ms = 6000): Promise<Response> =>
  Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);

/* Logged once per cold start, in whichever function boots this module
   first. Lengths only, never values — lets a debugging session confirm a
   secret is actually present and roughly the right shape (Spotify's id/
   secret are each 32 chars) via query_logs, without another live round-trip
   through the app to find out. */
console.log(
  'provider secrets loaded. Lengths:',
  JSON.stringify({
    TMDB_API_KEY: TMDB_KEY.length,
    SPOTIFY_CLIENT_ID: SPOTIFY_ID.length,
    SPOTIFY_CLIENT_SECRET: SPOTIFY_SEC.length,
    GOOGLE_BOOKS_KEY: GOOGLE_KEY.length,
  })
);
