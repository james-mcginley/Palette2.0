# Palette — Supabase backend

Schema, RLS policies, and edge functions for the Palette client in `mobile/`.
See `../PLAN.md` for how this fits into the overall build, and
`../project/handoff/ARCHITECTURE.md` / `COMPLIANCE.md` for the reasoning
behind specific decisions (most of this schema is a direct implementation of
those two documents).

## Live project

This schema and both edge functions are deployed to the **PallateLtd2**
Supabase project (`ouuwxjndxduchjwdghsu`, https://ouuwxjndxduchjwdghsu.supabase.co)
under the Palette Ltd organization — migrations 0001-0011 have all been
applied there directly, and `mobile/.env.local` already points at it. A
security-advisor pass came back clean of ERROR-level findings after 0008/0009
(two expected WARNs remain — `start_curator_path`/`advance_curator_path_node`
are meant to be callable by any signed-in user and only ever touch the
caller's own row).

**Still needed before the app is actually usable end-to-end** — none of these
have an MCP tool, so they need the Supabase dashboard or CLI directly:

1. **Provider secrets for `media-search`** — TMDB/Spotify/Google Books keys
   aren't set yet, so search will deploy fine but every provider will fail
   and return `{ items: [], failed: [...] }`. Dashboard → Edge Functions →
   Secrets, or:
   ```bash
   supabase link --project-ref ouuwxjndxduchjwdghsu
   supabase secrets set TMDB_API_KEY=… SPOTIFY_CLIENT_ID=… \
     SPOTIFY_CLIENT_SECRET=… GOOGLE_BOOKS_KEY=…
   ```
2. **Sign in with Apple / Google as Auth providers** — not yet configured
   in Auth → Providers. `config.toml`'s `[auth.external.apple]` /
   `[auth.external.google]` blocks show what's needed (client ID + secret
   from each console); nothing signs in until these are set.
3. **`pg_cron` sweep** for `search_cache` — see below, not run yet.

For local development against the Supabase CLI's Docker stack instead of the
hosted project: `supabase start`, then `supabase db reset` to apply
migrations from scratch.

## Schema map

| File | Covers |
|---|---|
| `0001_profiles_and_follows.sql` | `profiles`, `follows`, auto-create profile on signup |
| `0002_logs_and_lists.sql` | `logs` (the core log+review action), `lists`/`list_items`, default smart lists |
| `0003_curation_and_gamification.sql` | `curations`, curator paths/nodes, `user_path_progress`, `badges` |
| `0004_asks_and_mailbox.sql` | `asks`/`ask_answers`, `notifications` (the Mailbox — no like-counts, only things worth opening) |
| `0005_moderation.sql` | `reports`, `blocks`, auto-hide-at-3-reporters, `visible_*` views every read must go through |
| `0006_search_cache.sql` | Shared TTL cache for `media-search` |
| `0007_grants.sql` | Explicit role grants (this project is not dashboard-bootstrapped) |
| `0008_fix_view_security_and_grants.sql` | Closes a real gap in 0005: the `visible_*` views only worked by running as their owner and bypassing RLS entirely, which the security linter correctly flags as an ERROR. Adds an explicit "public, non-hidden, non-blocked content is readable" RLS policy to each base table, then switches the views to `security_invoker = true` so they enforce that policy instead of bypassing RLS. Also revokes default PUBLIC execute on the trigger-only functions and drops the exploitable `complete_curator_path()` (see 0009). |
| `0009_curator_path_progress_rpcs.sql` | Replaces `complete_curator_path()` — which had no guard, letting any signed-in user instantly complete any path and award themselves its badge — with `start_curator_path()` + `advance_curator_path_node()`, which only allow completing the node matching the caller's actual current position. |
| `0010_log_media_rpc.sql` | `log_media()` — the actual core-loop write. One atomic RPC that inserts the log *and* upserts the matching `list_items` row into the caller's smart "Consumed" list, so the client's offline mutation queue only ever has to persist and replay a single unit of work per log. |
| `0011_library_helpers.sql` | `add_to_want_list()` — the brief's "Save to My List" destination (as opposed to logging/"Publish to Feed"); upserts into the caller's smart "Want" list without creating a log. |

## Open items before this is production-ready

- **Curator paths and badges are seed data**, not user-authored — there's no
  admin UI yet. Seed via the SQL editor or a one-off script using the
  service role key.
- **`media-search` covers TMDB/Spotify/Google Books/Apple** per
  `COMPLIANCE.md`. `normalizeMedia.ts` also has an Open Library adapter that
  isn't wired into the function yet, and TVmaze/Wikipedia (used for TV and
  synopsis enrichment in the prototype's `palette-live.js`) have no adapters
  at all yet — both are keyless and can be added as additional
  `Promise.allSettled` branches without touching the client.
- **pg_cron sweep** for `search_cache` is commented out in
  `0006_search_cache.sql` — run it manually once per environment; it isn't a
  migration-safe operation.
- **Storage buckets** (`avatars`, event/venue photos from the ticket-stub
  card) aren't created here yet — add via `supabase storage create-bucket`
  or a dashboard-driven migration once the upload flow is built.
