# Audio cues

`mediaInteractions.ts` and `logging.shared.ts` both `require()` these files by
name, wrapped in `safeRequire`/`tryRequire` so a missing file degrades to
haptics-only rather than crashing the bundler or the app:

- `page_turn.mp3`
- `ticket_punch.mp3`
- `dial_click.mp3`
- `needle_drop.mp3`
- `stamp_thud.mp3`
- `typewriter_press.mp3`

None of these exist yet — no audio assets were part of the design handoff.
Drop real files in here with these exact names and nothing else needs to
change; `preloadMediaSounds()` / `useLogSound()` will pick them up
automatically.
