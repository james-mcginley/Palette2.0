# Audio cues

`mediaInteractions.ts` and `logging.shared.ts` both `require()` these files by
name:

- `page_turn.wav`
- `ticket_punch.wav`
- `dial_click.wav`
- `needle_drop.wav`
- `stamp_thud.wav`
- `typewriter_press.wav`

They're short synthesized placeholder tones, not real sound design — no audio
assets were part of the design handoff, so a build-time script generated a
distinct decaying tone per cue (see the git history for the generator).
Real recorded cues can replace any of these with a same-named file and
nothing else needs to change; `preloadMediaSounds()` / `useLogSound()` will
pick them up automatically.

**Why `.wav`, not `.mp3`:** these files used to not exist at all, and the
`.mp3` extension was just what the original code happened to ask for. Metro
resolves a local asset `require()` at bundle time, not at the call site — a
missing file fails the entire app's bundle before any JS runs, including the
`tryRequire`/`safeRequire` try/catch both call sites wrap it in. That was
this repo's actual state until these files were added: the app could not
build at all. `.wav` was the pragmatic choice for generating valid files
without a real encoder on hand; expo-av plays it identically to `.mp3` on
both platforms, so there's no reason to switch back once real cues arrive
unless the real files happen to be delivered as `.mp3`.
