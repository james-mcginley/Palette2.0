/**
 * Shared tokens and audio helper for the logging interactions.
 *
 * Ported from project/handoff/src/components/logging/logging.shared.ts.
 * The only change is the `require` paths for the audio cues: this file
 * moved from handoff/src/components/logging/ to mobile/src/components/logging/,
 * two directories above mobile/src/assets/audio/ instead of three above
 * handoff/assets/audio/. The .mp3 files themselves still need adding —
 * `tryRequire` degrades to haptics-only until then.
 *
 * Each Log component is standalone in behaviour but pulls its palette and its
 * sound plumbing from here, so six components don't restate the same six
 * constants or six copies of the expo-av lifecycle.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Audio, type AVPlaybackSource } from 'expo-av';
import { Easing, type WithSpringConfig } from 'react-native-reanimated';

/* ---- palette ---- */

export const PAPER = '#F2EFE9';
export const INK = '#0E3B2E';
export const MUSTARD = '#E8B93C';
export const SPOT_RED = '#C4372A';
export const CREAM = '#FBF7EC';

/* ---- motion vocabulary ----
 * Four springs, named for what they should feel like. `heavy` is deliberately
 * low-stiffness so a poster drops rather than snaps; `dial` is the only one
 * allowed to overshoot.
 */

export const SPRINGS = {
  weighty: { damping: 20, stiffness: 300, mass: 0.9 } as WithSpringConfig,
  heavy: { damping: 22, stiffness: 140, mass: 1.2 } as WithSpringConfig,
  dial: { damping: 9, stiffness: 420, mass: 0.8 } as WithSpringConfig,
  settle: { damping: 18, stiffness: 260, mass: 0.7 } as WithSpringConfig,
  recoil: { damping: 12, stiffness: 400, mass: 0.6 } as WithSpringConfig,
};

export const EASE_OUT = Easing.out(Easing.cubic);
export const EASE_IN = Easing.in(Easing.quad);

/* ---- audio ----
 * Sounds are optional. Every path is wrapped, because on a silent phone — which
 * is most of them — the haptic is the interaction and audio is a bonus that
 * must never be able to break a log.
 */

export type LogCue =
  | 'page_turn'
  | 'ticket_punch'
  | 'dial_click'
  | 'needle_drop'
  | 'stamp_thud'
  | 'typewriter_press';

const CUES: Record<LogCue, AVPlaybackSource | undefined> = {
  page_turn: tryRequire(() => require('../../assets/audio/page_turn.mp3')),
  ticket_punch: tryRequire(() => require('../../assets/audio/ticket_punch.mp3')),
  dial_click: tryRequire(() => require('../../assets/audio/dial_click.mp3')),
  needle_drop: tryRequire(() => require('../../assets/audio/needle_drop.mp3')),
  stamp_thud: tryRequire(() => require('../../assets/audio/stamp_thud.mp3')),
  typewriter_press: tryRequire(() => require('../../assets/audio/typewriter_press.mp3')),
};

function tryRequire(fn: () => AVPlaybackSource): AVPlaybackSource | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

/**
 * Loads one cue on mount and returns a fire-and-forget play function.
 *
 * Preloading matters: `createAsync` costs 200–400ms cold, which would land the
 * sound after a 300ms animation has already finished.
 */
export function useLogSound(cue: LogCue) {
  const ref = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let cancelled = false;
    const source = CUES[cue];
    if (!source) return;

    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          shouldDuckAndroid: true,
        });
        const { sound } = await Audio.Sound.createAsync(source, {
          volume: 0.45,
          shouldPlay: false,
        });
        if (cancelled) {
          sound.unloadAsync().catch(() => undefined);
          return;
        }
        ref.current = sound;
      } catch {
        /* Haptics-only from here. */
      }
    })();

    return () => {
      cancelled = true;
      ref.current?.unloadAsync().catch(() => undefined);
      ref.current = null;
    };
  }, [cue]);

  return useCallback(() => {
    const sound = ref.current;
    if (!sound) return;
    /* Rewind rather than reload — a second log can fire within the same second. */
    sound.setPositionAsync(0).then(() => sound.playAsync()).catch(() => undefined);
  }, []);
}
