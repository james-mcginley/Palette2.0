# Palette — build plan

This is the architecture/phasing plan that was the last open thread in the
design chat (`chats/chat1.md`) before this handoff happened. It picks that up
directly, using the decisions already made there and in
`project/handoff/{ARCHITECTURE,COMPLIANCE,EDITORIAL_SYSTEM}.md`.

**Stack:** Expo (React Native, iOS first, Android to follow) + Supabase
(Postgres/Auth/Storage/Edge Functions), TanStack Query for server state,
Zustand for local UI state, Sign in with Apple (mandatory) + Google, all
third-party media data (TMDB/Spotify/Google Books/Apple/Open Library)
proxied server-side. See `project/handoff/ARCHITECTURE.md` for the reasoning
behind each of these — this plan doesn't re-litigate them.

## Critical fix: the app could not build at all until this pass

`npx expo export` had never been run against this repo before — every prior
pass verified with `tsc --noEmit` only, which cannot catch this. The six
audio-cue `require()` calls in `logging.shared.ts` and `mediaInteractions.ts`
pointed at `.mp3` files that were never added (documented as a known gap,
with a comment claiming the surrounding `tryRequire`/`safeRequire` try/catch
would degrade missing files to haptics-only). That assumption was wrong:
Metro resolves a local asset `require()` at bundle time, not at the call
site, so a missing file fails the *entire* bundle before any JS — including
that try/catch — ever runs. Fixed by generating six short synthesized
placeholder tones as real `.wav` files under `mobile/src/assets/audio/`
(real cues can replace them later, same filenames) — see that directory's
README. Also fixed in the same pass: two real `tsc` errors
(`InterruptionModeAndroid`/`InterruptionModeIOS` imported from the wrong
place, an implicit-`any` callback param) that had been sitting alongside
every commit's typecheck output this whole project. `npm run typecheck` and
`npx expo export --platform ios` are both clean as of this commit — the
first time either has been true.

## What exists after this pass (Phase 0)

- `supabase/migrations/*.sql` — full schema: profiles, follows, logs,
  lists/list_items, curations, curator paths/nodes/progress, badges, asks,
  notifications (Mailbox), reports/blocks/moderation views, search_cache.
  RLS on every table. **Live**, not just written: all nine migrations are
  applied to the real "PallateLtd2" Supabase project (`ouuwxjndxduchjwdghsu`)
  — see `supabase/README.md`'s "Live project" section. A security-advisor
  pass came back clean of ERRORs after 0008/0009 fixed a real bug (the
  `visible_*` views were bypassing RLS entirely, and `complete_curator_path`
  had no guard against instant self-awarded badges — both are described in
  the schema map below).
- `supabase/functions/media-search` and `delete-account` — ported from
  `COMPLIANCE.md` and `ARCHITECTURE.md` respectively, working code, not
  pseudocode, and **deployed and ACTIVE** on the live project. Not yet
  functional end-to-end: no provider secrets are set, so `media-search`
  currently returns `{ items: [], failed: [...] }` for every query — see
  `supabase/README.md` for the exact commands to fix that (no MCP tool
  covers setting function secrets, so this needs the dashboard or CLI
  directly).
- `mobile/` — Expo TS app: navigation shell for the full IA (onboarding →
  Feed/Friends/+/Discover/Library tabs, Mailbox/Profile/Settings/MediaDetail/
  QuickCapture/LogSheet/CuratorPath as modal/stack routes), Supabase client
  with session in the Keychain, React Query with AsyncStorage persistence +
  NetInfo wiring, Zustand stores, Sign in with Apple wired end-to-end,
  delete-account wired end-to-end, live search against `media-search`, and
  the six logging-interaction components + AttributionFooter ported from
  `project/handoff/`. `mobile/.env.local` (gitignored) already points at the
  live project's URL + anon key. Apple/Google are not yet enabled as Auth
  providers in that project, so sign-in won't work until that's done in the
  dashboard (config.toml documents what each needs).
- Most **screens are `ScreenPlaceholder`** stand-ins with a note on what they
  need — this pass is the skeleton, not pixel-perfect UI.

## Visual direction — resolved

`mobile/src/theme/tokens.ts` originally flagged a three-way conflict between
the bound design system, `EDITORIAL_SYSTEM.md`, and the actual
`Palette.dc.html` CSS. Reading further into `chats/chat1.md` resolves it —
this isn't an open question, it's a documented history with an explicit
final call from the user:

1. **Brief → v1** (obsidian/emerald/terracotta, Playfair Display + Inter,
   asymmetric pebble radii) — the starting point, never fully final.
2. **Roboto adopted deliberately.** "YouTube's UI is Roboto... Applying that
   across the app" (chat1.md:4225) — Playfair dropped in favor of Roboto
   throughout, pebble radii and green/terracotta kept at this point
   (chat1.md:4449).
3. **GROOVE restyle, deliberate.** "I like the style of this other app
   'GROOVE'... adjust palette's design to be similar to this one and embed
   across the app" (chat1.md:4879) → black canvas, uniform rounded corners
   replacing pebble radii, briefly a violet accent (chat1.md:4969, 4995).
4. **Violet reverted to Palette's own green, deliberate.** "Change the purple
   parts to the same green as palette... the plus button in the middle make
   that same green as palette" (chat1.md:5029) — this is why the current
   source comment in `Palette.dc.html` (line ~55) still says "a single vivid
   violet accent" while the actual token value is green: the color was
   corrected but that comment was never updated.
5. **The espresso/amber/serif spec (`EDITORIAL_SYSTEM.md`) was explicitly
   rejected as a re-skin.** It was generated as a standalone spec doc
   ("Palette Analog Spec.dc.html"), and the very next message is: *"Not
   exactly what I wanted. I wanted you to just build those features into the
   existing app and mod it — keeping roughly the existing colour scheme.
   Revert and add in those changes"* (chat1.md:5850). The spec doc was
   deleted. Only the **structural/interaction ideas** from it survived —
   the editorial Discover grid layout, the A5 logbook page-turn, the
   sleeve-draw launch animation — reskinned into Palette's actual green/
   black/Roboto palette: *"All three analog features are in the app, in
   Palette's own green palette rather than the amber scheme I'd specced"*
   (chat1.md:5954). Serif never came back either — "editorial" headlines are
   italic Roboto (`font-style:italic` on `var(--font-display)`), not an
   actual serif face; a source comment confirms this directly: *"tracked
   serif overlay... The amber-side wash is done in accent green"*
   (Palette.dc.html:7527-7529).

**Conclusion:** the current `Palette.dc.html` — near-black canvas, all-Roboto
(no serif), green accent, uniform rounded corners, amber essentially retired
— is the deliberate, twice-reconfirmed final direction, not drift.
`EDITORIAL_SYSTEM.md` and the originally-bound design system are both
superseded drafts and shouldn't be used as a source of truth for colors,
type, or shape going forward (their layout/interaction ideas for Discover,
Logbook, and the entry animation are still valid — just not their tokens).
`mobile/src/theme/tokens.ts` already matches ground truth; I've updated its
header comment to state this as confirmed rather than an open conflict.

If any of this reasoning doesn't match what you actually intended, say so —
this is a reconstruction from the chat transcript, not a design decision I'm
making myself.

## Open decisions before pixel-perfect screen work starts

1. **Google sign-in scope/timeline.** Wired as a dead button right now —
   needs a decision on `expo-auth-session` vs. the native Google Sign-In SDK,
   and OAuth client setup in both consoles, before Phase 1 closes.
2. **Curator paths and badges are editorial/seed content**, not user
   generated. There's no admin tool. Decide whether Phase 4 needs a real
   admin surface or whether seeding via the SQL editor / a one-off script is
   fine for launch.
3. **Import-existing-lists onboarding step** (Letterboxd/Goodreads/Spotify
   export) — brief mentions it, no format or parser was ever specified. Real
   importer or soft-skip?

## Phase 1 — Library + Log (the core loop) — done

Per `ARCHITECTURE.md`'s stated build order: this before Search or Feed,
because logging is the app and everything else is discovery on top of it.

- **Library screen** (`LibraryScreen.tsx`) renders `list_items` (RLS-scoped,
  no explicit filter needed) with status pills (All/Want/In Progress/
  Consumed) and medium pills (All/Books/Cinema/Music/Podcasts/Gigs) reduced
  client-side — status lives per-item, not per-container, so a custom
  curation's items filter the same way the three smart lists' do. Tapping a
  row's status pill cycles want → in_progress → consumed via
  `useUpdateItemStatus`.
- **`log_media()` RPC** (`0010_log_media_rpc.sql`) replaced what would have
  been two separate client-side inserts: logging something now atomically
  inserts the log *and* upserts it into the caller's smart "Consumed" list in
  one round trip — required for the offline queue to persist and replay it
  as a single unit, and for "log something → see it in Library instantly" to
  actually be atomic rather than racy.
- **`LogSheetScreen`** uses the six ported per-medium components
  (`BookLogButton`/`FilmLogButton`/`TvLogButton`/`MusicLogButton`/
  `EventLogCard`, `CAST` falling back to `MusicLogButton` — there's no
  dedicated podcast button) as the actual submit control, each with its own
  real Reanimated animation, haptic and sound baked in. **Correction to the
  original plan:** these don't consume `mediaInteractions.ts`'s
  `coverScaleIn`/`overlayPulse` config at all — they're a separate,
  self-contained implementation from elsewhere in the design handoff.
  `mediaInteractions.ts` is still ported and available for a call site that
  actually needs the data-driven version (e.g. a Library status-toggle
  effect in a later phase).
- **Half-star rating** (`components/StarRating.tsx`) and a **backdate
  picker** (`@react-native-community/datetimepicker`, capped at today) are
  both wired into `LogSheetScreen` and threaded through to `log_media()`'s
  `p_logged_on`.
- **Offline mutation queue**: `createLog`'s mutation defaults are registered
  once at module load (`registerLogMutationDefaults`, called from
  `state/queryClient.ts`) rather than inside a component, specifically so a
  mutation paused offline can be persisted to AsyncStorage
  (`shouldDehydrateMutation: mutation.state.isPaused`) and resumed after a
  full force-quit via `queryClient.resumePausedMutations()` in `App.tsx`'s
  `PersistQueryClientProvider.onSuccess`. `LogSheetScreen` fires `.mutate()`
  and navigates back immediately rather than awaiting `mutateAsync` — the
  optimistic update already landed synchronously in `onMutate`, and awaiting
  the real network call would block "go back" for as long as the device is
  offline.
- **`MediaRow`** (`components/MediaRow.tsx`): one shared, accessible row used
  by Feed/Discover/Library — a single focusable "info" element per
  ARCHITECTURE.md §8 (dynamic label built only from fields that exist) plus
  an independently-focusable trailing action (status pill / "Log") rather
  than nesting a second control inside the same accessible group.
- **`add_to_want_list()` RPC** (`0011_library_helpers.sql`) + `useAddToWantList`
  exist for the brief's "Save to My List" destination, but aren't wired to
  any screen yet — no UI needed it for this phase's done-when bar.

**Not done, deliberately deferred:** Dynamic Type sizing/testing, and a
dedicated podcast log animation. Both are cosmetic gaps, not core-loop ones.

**Done when:** you can search, log, rate, and review a title while offline,
see it appear in Library instantly, and have it survive a force-quit before
reconnecting. ✅

## Phase 2 — Search + Discover

- [x] Wire Open Library into `media-search` (adapter already existed in
  `normalizeMedia.ts`, just not called) as a Google Books fallback/alternate
  — runs in parallel via the same `allSettled` fan-out, merged/deduped by
  `mergeResults`.
- [x] Add TVmaze and Wikipedia enrichment for TV/film synopsis — referenced
  by `AttributionFooter`'s provider list but no adapter existed yet for
  either. Capped at 3 calls per medium per search, never fails the request.
- [x] `useInfiniteQuery` pagination is already in `useMediaSearch`; added
  the "Show more results" button UI (`ARCHITECTURE.md` §9 — deliberately not
  auto-loading) to `DiscoverScreen`.
- [x] `media-detail` edge function + `useMediaDetail` query, so
  `MediaDetailScreen` can open from something other than a search result or
  an existing log — a passed-in snapshot is used as `initialData` so those
  paths still render with zero network round-trip.
- [x] Shared `_shared/providerAuth.ts`: TMDB/Spotify/Google secret reads and
  Spotify's client-credentials token exchange, split out of `media-search` so
  `media-detail` doesn't duplicate (and risk drifting from) the same logic.
  Includes the `.trim()` and UTF-8-safe base64 fixes from the Spotify
  `invalid_client` debugging session — **not yet re-verified against live
  Spotify credentials since those fixes deployed.**
- [x] Discover editorial grid from `EDITORIAL_SYSTEM.md` §1: all four tile
  types (`components/discover/{Feature,Collection,Ranked,Standard}Tile.tsx`),
  arranged by `lib/discoverGrid.ts` per the doc's grid-rhythm rule (no tile
  `kind` three-in-a-row). `components/Grain.tsx` replaces the web version's
  live SVG turbulence filter with a 128×128 noise PNG
  (`assets/textures/grain.png`, generated once by a build-time script, not
  regenerated on device) tiled to fill each card — the doc's own performance
  note ("do not attach a live SVG filter to a scrolling list") points at a
  pre-rendered texture either way. No serif/espresso here, same as
  everywhere else — amber stays editorial-chrome-only per the resolved
  palette.
  - Content is **real public curations only** (`curations`/`curation_items`
    via the `visible_curations`/`visible_curation_items` views — the latter
    needed a new RLS policy + view, `0012_visible_curation_items.sql`, since
    0008 only ever made the curation *row* public, not its items). Nothing
    is fabricated to fill empty space — the doc's own Logbook principle
    ("never generate a fake handwritten note") applies just as much to
    Discover, so a fresh database renders a genuine empty state
    ("No collections yet…") instead of seeded placeholder picks.
  - Added `CurationDetailScreen` (a small new screen, not in the original
    phase notes) as the destination for tapping a Collection/Ranked tile's
    background — without it those two tile types would be dead ends.
  - Not done: true photographic grading (`saturate`/`contrast`/`brightness`)
    on the Feature/Ranked tiles — approximated with a gradient scrim + amber
    wash instead of adding a pixel-filter native dependency for one effect.

## Phase 3 — Feed + Social

- [x] Onboarding flow was actually unreachable past step 1: `RootNavigator`
  gated on `session` alone, which is set the instant Apple sign-in resolves
  on `WelcomeScreen` — so it swapped straight to `Main` and steps 2-5
  (import lists, loved titles, genres, follow people) never rendered. Fixed
  with a real gate: `profiles.onboarding_completed_at` (`0013_...sql`, set
  once at the end of `FollowPeopleScreen`) plus `useMyProfile()` in
  `RootNavigator`. `ImportLists`/`PickLovedTitles`/`PickGenres` are now real,
  navigable "soft skip" steps rather than dead-end placeholders — each still
  needs the product decision its own placeholder note already flagged
  before it's worth building out further.
- [x] Follow/unfollow + user search (`lib/api/social.ts`, `UserRow`,
  `PeopleSearchList`) — backs both `FollowPeopleScreen` and a new
  `FindPeopleScreen` reached from the Friends tab.
- [x] Friends tab: join `follows` against `visible_logs`
  (`lib/api/feed.ts` — `useFriendActivityStream`, paginated). Feed shows a
  capped recent slice of the same query (`useFriendActivityFeed`), per
  "Feed keeps a short run of friends' logs; the full stream is the Friends
  tab" (Palette.dc.html:6910).
  - This surfaced that 'friends' visibility was a silent no-op: 0005/0008's
    `visible_logs`/`visible_curations` only ever filtered `visibility =
    'public'`, so a 'friends'-tier log was reachable by nobody but its
    author despite 0002's own comment saying the view would enforce it.
    Fixed in `0014_friends_visibility.sql` — the RLS policy now also admits
    a 'friends'-visibility row to the author's followers, and both views
    collapsed to a plain `select *` now that RLS (not the view's own WHERE)
    is the single source of truth for who can see what.
- [ ] Feed: "Daily Vibe Anchor" prompt, curator/tastemaker shelves. Still
  needs the tastemaker-vs-regular-user decision (a flag on `profiles`, most
  likely) — deferred rather than guessed, and there's no real tastemaker
  content yet to populate a shelf with regardless.
- [x] Asks: UI over `asks`/`ask_answers` (`AsksScreen`, `AskDetailScreen`,
  `lib/api/asks.ts`) — post a question, browse and answer others' open
  asks, thread of answers per ask. Answering closes an ask to further
  answers, mirroring the existing RLS insert policy (`status = 'open'`
  required) rather than fighting it — the composer just disappears once
  `status` flips. Reached from a "Asks" button on Discover's search bar
  (Palette.dc.html's own IA puts Asks as a Discover filter chip;
  implemented here as its own screen instead of a fifth filter chip — same
  destination, smaller change) and from QuickCaptureScreen's "Ask for a
  recommendation instead" link, which had been sitting there as a dead
  link since Phase 0 pending exactly this. `MailboxScreen` is real now too
  (`lib/api/notifications.ts`) — `ask_answered` notifications open
  `AskDetail` directly; `badge_earned`/`path_node_unlocked` render generic
  copy since Phase 4 hasn't shipped the screens they'd link to.
- [x] Report/block UI per `COMPLIANCE.md` §1 — `ReportBlockMenu` is the `⋯`
  entry point (reason list → optional detail → the required "we review
  reports within 24 hours" copy; block gets its own destructive confirm
  stating what it does, per the doc's exact wording). Built on two new
  cross-platform primitives, `ActionSheet` and `ConfirmDialog` — not
  `ActionSheetIOS`, which has no Android equivalent to fall back to later.
  Wired into Feed/Friends log rows (via a new `moreMenu` slot on `MediaRow`),
  `CurationDetailScreen`'s header, and now `AskDetailScreen` (both the ask
  and each answer) — all three of COMPLIANCE.md §1's named UGC surfaces
  (curations, reviews/logs, Asks answers) now carry it. Settings → Privacy
  now has the required unblockable blocked-list and a Terms of Use link —
  the terms screen itself is a marked placeholder, not real legal text; it
  exists so the link and flow are real, but shipping still needs actual
  legal drafting.

## Phase 4 — Gamified curator paths + badges

- [x] Snake-path UI over `curator_path_nodes` + `user_path_progress`
  (`CuratorPathsScreen` browse list, `CuratorPathScreen` detail).
  `start_curator_path()` and `advance_curator_path_node()` already existed
  and are atomic (progress + badge award in one transaction, sequential-only
  — `0009_curator_path_progress_rpcs.sql`) — the UI is a thin wrapper by
  design: node position/lock state is derived straight from
  `user_path_progress.current_node_position` rather than re-deriving
  "is this node unlocked" client-side, since the RPC is the only thing that
  can actually make that true. Reached from Discover (same "own screen
  instead of a filter chip" pattern as Asks/Paths in the design's IA).
- [ ] Confetti animation on path completion — currently a plain
  `ConfirmDialog` acknowledgment naming the earned badge; the flourish is
  cosmetic polish, not core to the loop working.
- [ ] Badge grid on Profile — blocked on `ProfileScreen` itself still being
  a placeholder (bio, monthly mosaic, user curations all still unbuilt
  there too), not on anything path-specific.
- [ ] Seed at least one real curator path (the brief's example: "French New
  Wave and Its Aftershocks") via the SQL editor per Open Decision #2 above.
  Deliberately not done here: this sandbox has no live network access to
  TMDB/Spotify/etc. to verify real provider ids against, and
  `curator_path_nodes.media_refs` is meant to carry a real, checkable
  snapshot (per the same "never fabricate content" principle applied to
  Discover's curations) — better done by whoever can verify the picks
  against a live provider than guessed here. `CuratorPathsScreen`'s empty
  state says as much.

## Phase 5 — Profile, Mailbox, Settings polish

- [x] Monthly Mosaic using the already-ported `MonthlyMosaic` component —
  `ProfileScreen`'s "This month" section, fed the signed-in user's own logs
  filtered to the current calendar month.
- [x] User-created bundles (curations) UI — `CurationBuilderScreen`
  (`lib/api/curations.ts`). This was the actual missing piece behind
  Discover's editorial grid and `CurationDetailScreen` only ever rendering
  their empty state: the schema existed since Phase 0, but nothing let a
  user create a curation at all. Create and edit share one screen; a new
  curation is an edit session that starts with an insert.
- [x] Mailbox screen over `notifications` — done in Phase 3 alongside Asks
  (real rows from the new-follower and ask-answered triggers; tapping an
  `ask_answered` row opens `AskDetail` directly).
- [x] Settings: blocked-users list with unblock, Terms of Use link — done in
  Phase 3 alongside report/block. (No theme/accent override planned — see
  the resolved visual-direction note above; the palette is fixed, not
  user-configurable, per the chat. No separate "privacy toggles" beyond
  blocking/`is_private` exist to expose yet.)
- Also fixed here: `Profile` and `Settings` were both registered routes
  nothing navigated to — added a "Profile" button to `LibraryScreen`'s
  header and a "Settings" button on `ProfileScreen` itself. Viewing
  someone *else's* profile (`route.params.userId`) is still a stub — it
  needs a public-read version of every `useMy*` query here plus its own
  empty/private-account states, which is real scope, not a quick follow-on.

## Phase 6 — App Store compliance pass

Everything in `COMPLIANCE.md`'s pre-submission checklist that isn't already
done:

- [x] Delete account, in-app, cascading — done in Phase 0.
- [x] Report flow on every public surface, 24-hour commitment stated — done
  in Phase 3 (`ReportBlockMenu`); "every public surface" now covers all
  three of COMPLIANCE.md's named UGC surfaces (curations, logs, Asks
  answers).
- [x] Block, symmetric, with unblock list in Settings — done in Phase 3.
- [x] Terms of Use with the zero-tolerance clause, linked in-app — the link
  and flow are real (Settings → Terms of Use); the text itself is a marked
  placeholder pending actual legal drafting, which this pass can't do.
- [x] Data export, JSON (access + portability obligations) — Settings →
  "Export your data (JSON)" (`lib/api/dataExport.ts`). No edge function or
  service role: every table read is one RLS already grants the caller full
  access to their own rows, so this is "read what I'm allowed to read and
  package it," not a privileged operation like delete-account is.
  `Promise.allSettled` across the ten tables so one failing doesn't zero out
  the rest.
- [x] Privacy policy URL, live before submission — same situation as Terms
  of Use: the in-app link and screen are real (Settings → Privacy Policy),
  the text is a marked placeholder, and "live before submission" still
  means a real hosted URL + real legal text neither of which this pass can
  produce.
- [x] Zero provider keys in the bundle — verified: grepped
  `mobile/src`/`app.json`/`.env*` for all four provider key names (none
  found), confirmed `.env.local` was never committed
  (`git log --all -- mobile/.env.local` is empty), and `.env.example`
  carries only the public Supabase URL/anon key with an explicit comment
  that no provider key belongs there.
- [ ] Privacy nutrition label matches observed behaviour
- [x] Attribution screen reachable from Settings — added `AttributionScreen`
  (all providers, not filtered by medium — several providers' terms expect
  their credit discoverable on its own, not only attached to one piece of
  content) and linked it from Settings → "Data & Artwork Credits".
- [ ] Demo account credentials prepared for the reviewer
- [x] `pg_cron` sweep for `search_cache` actually scheduled — ran the
  commented-out `cron.schedule` call for real (`pg_cron` wasn't enabled on
  this project; enabled it first). Confirmed via `select * from cron.job`:
  `search-cache-sweep`, `0 3 * * *`, active.

## Phase 7 — Editorial polish

The set-piece *structure* from `EDITORIAL_SYSTEM.md` — Discover grid first
(already Phase 2), then the cold-launch entry animation (polaroid draw), then
the Logbook A5 spread with the page-turn gesture last, per that document's own
"Handover notes" sequencing ("most technically involved, least critical,
needs 10+ logged items before anyone sees it"). Build these against the
resolved palette (`theme/tokens.ts` — green/black/Roboto), **not**
`EDITORIAL_SYSTEM.md`'s own espresso/amber/serif tokens, which chat1.md:5850
rejected. Grain texture, taped-photo rotation, and page-turn physics are
still worth taking from that doc — just not its color/type values.

- [x] Cold-launch entry animation, "the polaroid draw"
  (`components/entry/EntryAnimation.tsx`) — dark→draw→settle→spread on the
  5 most recently logged covers, skippable on any touch, reduce-motion
  collapses to a 200ms fade, a safety timer covers a backgrounded-mid-
  sequence edge case, and a brand-new account with zero logs skips straight
  to Feed rather than animating nothing. `state/entryAnimationStore.ts`'s
  module-level (unpersisted) flag is what makes this cold-launch-only:
  it resets on process restart and nowhere else, exactly matching "warm
  resume goes straight to the feed." One deliberate simplification: "cards
  fan into their feed positions" is fan-and-fade, not a FLIP animation into
  each card's real future FlatList row coordinates — that's substantially
  more engineering for a once-per-cold-launch flourish. The doc's separate
  "interactive rest state" (drag-to-discard the top card, tilt parallax,
  long-press lift) is a persistent Feed interaction model, not part of the
  entry sequence — not built.
  - Found and fixed while building this: `theme/tokens.ts` names
    `fontFamily: 'Roboto'`/`'RobotoMono'`/`'Caveat'` everywhere, but no
    `expo-font` `useFonts()` call anywhere in the app ever actually loaded
    them — every screen has been silently rendering in the OS system font
    this whole project. Left Roboto alone (see `App.tsx`'s comment for why:
    iOS's silent fallback to San Francisco currently respects `fontWeight`
    correctly, and a custom-loaded "Roboto" wouldn't, since custom fonts on
    iOS need one distinct family name per weight — fixing that properly
    means touching every weight in `textStyles`, unverified, across the
    whole app). Loaded only `RobotoMono` and `Caveat`, the two faces this
    app uses at exactly one weight each and that a system font can't
    substitute for (a true monospace stamp face; a handwritten annotation
    face the Logbook depends on). Imported from each package's per-weight
    subpath, not its root — the root barrel re-exports and therefore
    bundles every weight of the font, which pulled in ~2.4MB of unused
    `.ttf` files for the one weight of each actually used.
- [x] Logbook A5 spread with the page-turn gesture
  (`screens/logbook/LogbookScreen.tsx`, `components/logbook/*`,
  `lib/api/logbook.ts`). Desk ground, dot-grid paper, taped covers rotated
  ±1–2° per item id with a tape strip, star stamps with the "not a clean
  glyph row" per-star jitter, and hand-written annotations pulled only from
  the user's own review text (`components/logbook/TapedPhoto.tsx`) — never
  a placeholder note, matching the doc's explicit rule and the same
  never-fabricate principle already applied to Discover's curations.
  Reached from Profile, and only shown there once ≥10 items are logged
  ("hidden, not disabled, before that").
  - The page turn itself: `Gesture.Pan()` driving a Reanimated shared value
    on the UI thread into a `useAnimatedStyle`-computed `rotateY`, per the
    doc's own explicit warning that a JS-thread implementation would drop
    frames — perspective 1600, spine-anchored rotation, 35% completion
    threshold, 420ms cubic-bezier easing, haptic at the 90° crossing, and a
    reduce-motion fallback that drops the 3D transform entirely for a plain
    fade + Prev/Next buttons.
  - **Deliberate simplification, disclosed in the screen's own header
    comment:** a full two-page spread turns as one rigid unit around the
    spine, rather than one page (recto/verso) turning independently while
    its facing page stays fixed — true book physics needs per-page
    pre-mirrored back-face content and z-ordering across three-plus
    simultaneous leaves at once. "One week is one flippable card" still
    delivers every piece of physics the doc calls the actual point, without
    that much larger, harder-to-verify 3D layout problem — unverifiable
    here specifically, since this sandbox has no simulator to look at any
    of this on.
  - "Pinch-out zooms to a year view" is a tappable grid
    (`LogbookYearScreen`) reached by a button, not an actual pinch
    gesture — same destination (jump straight to a week), a fraction of
    the engineering.
  - Not implemented: the fps-based half of "below 60fps, or with
    reduce-motion set" — only the reduce-motion branch exists; detecting
    an actual dropped-frames condition at runtime and switching
    mid-interaction is real scope beyond a single accessibility-setting
    check.

## Phase 8 — Android

Deferred by design (`ARCHITECTURE.md` §1: "Android is wanted eventually;
rewriting later is worse than starting cross-platform"), not started. Expect
haptics config (`mediaInteractions.ts` already halves the pattern for
Android), image/performance tuning, and a second store listing/compliance
pass — Google Play's requirements overlap with but don't duplicate Apple's.

## Explicitly out of scope for this repo, right now

- Payment/subscription tiers — never mentioned in the design chat.
- Any admin/CMS tooling beyond "use the SQL editor" (Open Decision #2).
- Analytics — deliberately absent; adding it later changes the privacy
  nutrition label (`COMPLIANCE.md` §3) and isn't free to bolt on.
