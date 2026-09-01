# Palette — Architecture Handoff

For the Claude Code build. This documents the decisions the prototype makes
implicitly, so they don't get re-litigated or lost in translation.

Companion files:
- `handoff/normalizeMedia.js` — four provider shapes → one `MediaItem`
- `handoff/AttributionFooter.jsx` — legal attribution, per medium

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Client | Expo (React Native) | One codebase for iOS and Android. Android is wanted eventually; rewriting later is worse than starting cross-platform. |
| Auth + DB | Supabase | Sign in with Apple and Google out of the box, Postgres with row-level security, and an edge-function runtime for the key-hiding proxy. |
| Remote state | TanStack Query | Built for exactly this problem: cached server data, per-query loading and error states, background refetch, offline persistence. |
| Local state | Zustand | The small amount of genuinely local state (filters, sheet open/closed, draft log). Redux is more ceremony than this app needs. |
| Images | `expo-image` | Disk + memory caching, `recyclingKey` for list reuse, blurhash placeholders. |

**Why two state libraries, not one.** They solve different problems. Query
owns anything that came from a server and can go stale. Zustand owns anything
that is true only on this device right now. Putting server data in Zustand
means hand-writing cache invalidation; putting UI state in Query means
fighting its refetch model.

---

## 2. API keys — the one hard rule

**No provider key ships in the app bundle.** A React Native binary is
unpackable; anything in it is public.

Every third-party call goes through a Supabase edge function:

```
app → supabase.functions.invoke('media-search', { q, types })
        → edge function holds TMDB_KEY, SPOTIFY_SECRET, GOOGLE_BOOKS_KEY
        → calls providers, normalizes, returns MediaItem[]
```

This buys three things beyond secrecy:

1. **Normalization server-side** — the client receives `MediaItem[]` and never
   knows a provider shape existed.
2. **One rate-limit budget** — the function caches hot queries in Postgres, so
   a thousand users searching "Aftersun" is one TMDB call, not a thousand.
3. **Provider swaps are invisible** — replacing Spotify with Deezer touches one
   file and ships without an App Store review.

Spotify specifically: use **client credentials** in the edge function. Do not
use PKCE unless you actually need per-user playback data — it forces every user
through a Spotify login, which is a brutal onboarding tax for a feature most
users won't touch.

---

## 3. Partial failure

**The rule: one provider failing must never empty the screen.**

`settleProviders()` in `normalizeMedia.js` uses `Promise.allSettled`, so the
response is always `{ items, failed }`. The UI renders `items` and reports
`failed` as a quiet inline chip beside the results — "Music unavailable" — not
a modal, not a toast, not an empty state.

This is already built in the prototype: `pendingSourceList` shows one chip per
provider, amber while in flight, green on success, grey on failure.

```js
const { items, failed } = await settleProviders({
  tmdb:   searchTMDB(q),
  google: searchGoogleBooks(q),
  spotify: searchSpotify(q),
  apple:  searchApple(q),
});
```

With TanStack Query, a failed provider should **not** mark the whole query as
errored — return the partial result and let the component decide:

```js
useQuery({
  queryKey: ['search', q],
  queryFn: () => searchAll(q),        // resolves with { items, failed }
  staleTime: 5 * 60_000,              // searches don't change minute to minute
  retry: (count, err) => count < 2 && err.status !== 429,
});
```

---

## 4. Rate limiting

Four providers, four different limits. Three layers, in order of how much
traffic each one removes:

**Debounce (client).** 400ms after the last keystroke, not per keystroke. The
prototype uses 420ms. Typing "aftersun" fires one request, not eight.

**Cache (client).** `staleTime: 5 minutes` on search queries. Re-running a
recent search hits memory.

**Cache (server).** A `search_cache` table keyed on the normalized query,
TTL 24h. Shared across all users — this is what makes the app survive going
viral.

**Backoff.** On 429, respect `Retry-After`; exponential otherwise. Never retry
a 429 immediately.

Also: minimum query length of 2 characters, and cancel in-flight requests when
the query changes (`AbortController` — already in `palette-live.js`).

---

## 5. Offline

The distinction that matters: **your library is yours, discovery is not.**

- **Your data** (logs, lists, profile) — must work offline, always. Persist the
  Query cache to AsyncStorage; hydrate on launch before first paint.
- **Discovery** (search, trending, recommendations) — needs a connection.
  Show the cached version with the offline banner, don't pretend to fetch.

```js
persistQueryClient({
  queryClient,
  persister: createAsyncStoragePersister({ storage: AsyncStorage }),
  maxAge: 1000 * 60 * 60 * 24 * 7,
  dehydrateOptions: {
    // Only user-owned data survives a restart. Search results are cheap
    // to refetch and go stale fast.
    shouldDehydrateQuery: (q) => ['library', 'lists', 'profile']
      .includes(q.queryKey[0]),
  },
});
```

**Writes while offline.** Logging something with no signal must still work —
it's the app's core action. Use an optimistic mutation with a mutation queue:
the log appears instantly, syncs when signal returns. `onlineManager` from
TanStack Query handles the reconnect trigger.

The banner is built in the prototype (Settings → Data → Simulate offline).
Wire it to `NetInfo` in the real build.

### The journey you asked about

1. **Sign in with Apple.** Supabase stores the session in `expo-secure-store`
   (Keychain), not AsyncStorage. Auto-refresh on. Never persist the refresh
   token anywhere readable.
2. **Goes offline.** `onlineManager` flips; Query stops refetching and serves
   cache. The banner appears.
3. **Opens their library.** Hydrated from the persisted cache on launch. Renders
   fully. Any log made while offline is queued and syncs on reconnect.

The screen is never blank because the library query was persisted, not because
of a special offline code path.

---

## 6. Delete account (App Store requirement)

Apple rejects apps that let you create an account but not delete one. It must
be reachable in-app, not via a support email.

**Placement:** Settings → Account → Delete account. Confirmation requires typing
the word `DELETE` — a two-tap destructive action here is too easy to fire by
accident.

**Copy:** say exactly what goes, and what it means. "This removes your account,
your logs, your lists and your reviews. It cannot be undone." Offer the export
first — most people asking to delete actually want their data out.

```sql
-- Cascade from auth.users so nothing is orphaned.
alter table public.logs
  add constraint logs_user_fk
  foreign key (user_id) references auth.users(id) on delete cascade;
-- repeat for lists, list_items, reviews, follows, profiles
```

```ts
// supabase/functions/delete-account/index.ts
// Runs with the service role, which the client never sees.
const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
if (!user) return new Response('Unauthorized', { status: 401 });

await supabaseAdmin.storage.from('avatars').remove([`${user.id}/avatar.jpg`]);
await supabaseAdmin.auth.admin.deleteUser(user.id);  // cascades the rest
return new Response(null, { status: 204 });
```

Verify the cascade in a test before shipping. An orphaned `logs` row with a
dangling `user_id` is a GDPR problem, not a bug.

---

## 7. Image performance

Lists of remote posters are where React Native apps stutter. Four things fix it:

**Use `expo-image`, not `<Image>`.** Disk caching, better decode, blurhash.

**Set `recyclingKey`.** Without it, a recycled row briefly shows the previous
item's poster — the single most common cause of "why did it flash the wrong
cover".

```jsx
<Image
  source={{ uri: item.imageUrl }}
  recyclingKey={item.id}
  cachePolicy="memory-disk"
  placeholder={{ blurhash: item.blurhash }}
  transition={180}
  contentFit="cover"
  style={{ width: 42, height: 58, borderRadius: 8 }}
/>
```

**Request the size you render.** TMDB's `w500` for a 42pt thumbnail wastes
memory and decode time on every row. Pick the width band nearest the rendered
size — `w185` for thumbnails, `w500` for detail.

**Use FlashList.** `estimatedItemSize` lets it recycle properly; FlatList
struggles past a few hundred rows of images.

Memory leaks come from unbounded caches. Cap the disk cache and clear it on
`onLowMemory`.

---

## 8. Accessibility

The prototype's touch targets are 44pt minimum. Keep that.

`MediaCard` should be **one** accessible element, not four. A screen reader
user does not want to swipe past a poster, a title, a creator and a year
separately.

```jsx
<Pressable
  accessible
  accessibilityRole="button"
  // Dynamic label, built from what actually exists — never announce
  // "undefined" for a missing creator.
  accessibilityLabel={[
    item.title,
    item.creator,
    item.releaseYear,
    MEDIA_LABEL[item.mediaType],   // "Film", "Album", "Book"
    item.rating ? `rated ${item.rating} out of 5` : null,
  ].filter(Boolean).join(', ')}
  accessibilityHint="Opens details"
  hitSlop={8}
  style={{ minHeight: 44 }}
>
```

The poster itself: `accessibilityElementsHidden` and
`importantForAccessibility="no-hide-descendants"` — the label already covers it.

Other musts:
- Support Dynamic Type. Don't cap `allowFontScaling`; test at the largest size.
- Contrast: the app's `--slate-dim` on `--surface-sunken` is borderline at small
  sizes. Audit against 4.5:1 before submission.
- Honour `prefers-reduced-motion` for the splash and the Friday Five reveal.
- Every icon-only button (share, settings, close) needs an
  `accessibilityLabel`. There are several in the prototype.

---

## 9. Pagination

TMDB returns page 1 of N. Without pagination the user sees 20 results and
assumes that's everything.

Use `useInfiniteQuery`, appending rather than replacing:

```js
useInfiniteQuery({
  queryKey: ['search', q],
  queryFn: ({ pageParam = 1 }) => searchAll(q, pageParam),
  getNextPageParam: (last, all) =>
    last.hasMore ? all.length + 1 : undefined,
});
```

The prototype uses an explicit "Show more results" button rather than automatic
infinite scroll. That was deliberate: auto-loading fights the "quiet, editorial"
tone and makes the footer attribution unreachable. Keep the button, or make
auto-load stop after page 3.

---

## 10. Build order

1. Supabase project, schema, RLS policies, Apple + Google sign-in
2. `media-search` edge function with the normalizer and cache
3. Query + Zustand wiring, persisted cache, offline banner
4. Screens, in this order: Library → Log flow → Search → Feed → Discover
   (library first, because logging is the core loop and everything else is
   discovery on top of it)
5. Delete account, attribution screen, accessibility pass
6. TestFlight

**Ship-blockers for App Store review:** delete account, privacy policy URL,
attribution screen, `NSUserTrackingUsageDescription` if any analytics, and a
demo account for the reviewer.
