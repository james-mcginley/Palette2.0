# Palette — mobile client

Expo (React Native) client for Palette. See `../PLAN.md` for the overall
build roadmap and `../supabase/README.md` for the backend this talks to.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in from your Supabase project settings
npx expo start
```

Phases 0 and 1 are done (navigation shell + data layer, then the Library +
Log core loop, offline-capable) — not yet a pixel-perfect implementation of
`project/Palette.dc.html`. See PLAN.md for what's built vs. deferred, screen
by screen.

## Structure

```
src/
  App.tsx                 Providers: gesture handler, safe area, React Query
                           (persisted), navigation
  navigation/              React Navigation: onboarding stack, root stack,
                           bottom tabs (Feed/Friends/+/Discover/Library)
  screens/                 One file per screen; Library and the LogSheet
                           flow are real (Phase 1), most others are still
                           ScreenPlaceholder stand-ins pending Phase 2+ (see
                           PLAN.md)
  state/
    authStore.ts           Zustand — the Supabase session (device-local)
    uiStore.ts              Zustand — filters, sheet open/closed, draft log
    queryClient.ts          React Query client + AsyncStorage persister,
                           NetInfo → onlineManager wiring, registers the
                           createLog mutation defaults the offline queue
                           needs (see lib/api/logs.ts)
  lib/
    supabase.ts             Supabase client, session in SecureStore (Keychain)
    api/                    React Query hooks per domain — mediaSearch, logs
                           (log_media() RPC + the offline mutation queue),
                           library (list_items, status toggle, Want-list save)
    types/media.ts           MediaItem — mirrors supabase/functions/_shared
  components/
    AttributionFooter.tsx    Ported from project/handoff/AttributionFooter.jsx
    mediaInteractions.ts     Ported from project/handoff/src/utils/ — a
                             data-driven haptic/animation "recipe" system,
                             NOT what drives components/logging/ below (see
                             LogSheetScreen's header comment)
    logging/                 Ported from project/handoff/src/components/logging/
                             — self-contained per-medium buttons, each with
                             its own Reanimated values/haptics/sound baked
                             in (BookLogButton, FilmLogButton, TvLogButton,
                             MusicLogButton, EventLogCard, MonthlyMosaic).
                             The first five are wired as LogSheetScreen's
                             real submit control.
    MediaRow.tsx             Shared accessible row (Feed/Discover/Library) —
                             one focusable element for title/creator/year/
                             medium/rating, per ARCHITECTURE.md §8
    StarRating.tsx           Half-star rating input, used by LogSheetScreen
  theme/tokens.ts            Colors/type/spacing/shape/shadow — matches the
                             confirmed final direction (green/black/Roboto),
                             not EDITORIAL_SYSTEM.md's espresso/amber/serif
                             draft, which was explicitly rejected — see the
                             file's header and PLAN.md for the sourced trace
  assets/audio/              Sound cues referenced by the logging components;
                             not sourced yet, see the README there
```

## Known gaps in this pass

- **Google sign-in isn't wired up.** The button exists on the Welcome screen
  but is inert — needs an OAuth client (`@react-native-google-signin` or
  `expo-auth-session`) configured in the Supabase and Google consoles.
- **No dedicated podcast log animation.** `CAST` falls back to
  `MusicLogButton` in `LogSheetScreen` — there's no ported component for it.
- **Dynamic Type sizing isn't tested.** ARCHITECTURE.md §8 calls this out
  explicitly; nothing caps `allowFontScaling`, but it hasn't been verified at
  the largest accessibility sizes either.
- **No detail-by-id query.** `MediaDetailScreen` only renders a MediaItem
  passed via route params; there's no `media-detail` edge function or query
  yet for opening a card from something other than search/a log.
- **Confetti, page-turn logbook, entry-animation, grain texture** — the
  EDITORIAL_SYSTEM.md set pieces — aren't started. They're explicitly late
  in the build order (that doc's own "Handover notes" section agrees). Build
  these against `theme/tokens.ts`'s palette, not that doc's own color/type
  tokens — see PLAN.md's "Visual direction — resolved" section for why.
