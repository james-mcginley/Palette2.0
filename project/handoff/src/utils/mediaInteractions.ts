/**
 * mediaInteractions.ts
 *
 * Every media type gets its own logging gesture — a shelf slide for books, a
 * ticket punch for films, a needle drop for records. Each combines a haptic
 * pattern, an optional sound, and a Reanimated config the calling component
 * drives.
 *
 * Three rules hold throughout:
 *
 *  1. Haptics are the floor, not the garnish. Sound is optional and may be
 *     missing, muted, or still loading; the haptic pattern always fires. Every
 *     audio path is wrapped so a failed load can never break a log.
 *  2. Nothing exceeds 400ms. Logging happens dozens of times a week — an
 *     animation that delights once becomes an obstacle by the tenth time.
 *  3. Sounds are preloaded and reused. Creating an Audio.Sound at trigger time
 *     costs 200–400ms on a cold cache, which lands the sound after the
 *     animation has finished.
 *
 * Usage:
 *
 *   await preloadMediaSounds();                  // once, at app start
 *   const { animation } = await triggerMediaLogEffect('book');
 *   coverScale.value = withSequence(...);        // see animation.cover
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio, AVPlaybackSource } from 'expo-av';
import {
  Easing,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type MediaType = 'book' | 'film' | 'tv' | 'music' | 'event';

/** The Mosaic is a screen-level composition, not a single-item log. */
export type EffectKey = MediaType | 'mosaic';

type HapticStep =
  | { kind: 'impact'; style: Haptics.ImpactFeedbackStyle; at: number }
  | { kind: 'notify'; style: Haptics.NotificationFeedbackType; at: number };

export interface MediaAnimationConfig {
  /** Primary artwork transform. */
  cover: {
    scaleFrom: number;
    scaleTo: number;
    rotateFrom?: number;
    rotateTo?: number;
    translateXFrom?: number;
    translateYFrom?: number;
    spring: WithSpringConfig;
  };
  /** The transient overlay: ticket stub, tonearm, wax seal, scanline. */
  overlay?: {
    id: 'ticket' | 'tonearm' | 'scanline' | 'seal' | 'dust';
    enter: WithTimingConfig;
    exit: WithTimingConfig;
    /** How long the overlay holds at full opacity before exiting. */
    holdMs: number;
  };
  /** Total wall-clock budget, for callers scheduling a completion callback. */
  durationMs: number;
}

export interface TriggerResult {
  animation: MediaAnimationConfig;
  /** False when audio was unavailable — the haptic still fired. */
  soundPlayed: boolean;
}

/* ------------------------------------------------------------------ *
 * Motion vocabulary
 *
 * Two springs and two timings, shared across every effect, so the whole app
 * moves with one hand. `press` is heavier than `settle` — it is the one that
 * should feel like a physical object arriving.
 * ------------------------------------------------------------------ */

const SPRING = {
  settle: { damping: 18, stiffness: 260, mass: 0.7 } as WithSpringConfig,
  press: { damping: 14, stiffness: 340, mass: 0.9 } as WithSpringConfig,
  /** No overshoot — for anything that must land flat, like a stamp. */
  flat: { damping: 26, stiffness: 300, mass: 0.8 } as WithSpringConfig,
};

const TIMING = {
  fastIn: { duration: 110, easing: Easing.out(Easing.quad) } as WithTimingConfig,
  fastOut: { duration: 140, easing: Easing.in(Easing.quad) } as WithTimingConfig,
  snap: { duration: 90, easing: Easing.out(Easing.cubic) } as WithTimingConfig,
};

/* ------------------------------------------------------------------ *
 * Per-type recipes
 * ------------------------------------------------------------------ */

const RECIPES: Record<EffectKey, {
  haptics: HapticStep[];
  sound?: string;
  animation: MediaAnimationConfig;
}> = {
  /**
   * Books — "The Shelf Slide"
   * Slides in from the right and seats itself, with ink dust off the corner.
   * The double haptic is the point: contact, then settle.
   */
  book: {
    sound: 'page_turn',
    haptics: [
      { kind: 'impact', style: Haptics.ImpactFeedbackStyle.Light, at: 0 },
      { kind: 'impact', style: Haptics.ImpactFeedbackStyle.Soft, at: 70 },
    ],
    animation: {
      cover: {
        scaleFrom: 0.9,
        scaleTo: 1,
        translateXFrom: 34,
        spring: SPRING.settle,
      },
      overlay: { id: 'dust', enter: TIMING.snap, exit: TIMING.fastOut, holdMs: 60 },
      durationMs: 340,
    },
  },

  /**
   * Films — "The Ticket Punch"
   * Poster drops, a stub overlays it, a hole punches through, stub clears.
   * Heavy impact on the punch frame, not on entry.
   */
  film: {
    sound: 'ticket_punch',
    haptics: [
      { kind: 'impact', style: Haptics.ImpactFeedbackStyle.Heavy, at: 90 },
    ],
    animation: {
      cover: {
        scaleFrom: 1.04,
        scaleTo: 1,
        translateYFrom: -22,
        spring: SPRING.press,
      },
      overlay: { id: 'ticket', enter: TIMING.fastIn, exit: TIMING.fastOut, holdMs: 120 },
      durationMs: 380,
    },
  },

  /**
   * TV — "The Dial Click"
   * A short counter-rotation into position with an analog scanline collapsing
   * into the artwork. Two medium taps read as one mechanical click-click.
   */
  tv: {
    sound: 'dial_click',
    haptics: [
      { kind: 'impact', style: Haptics.ImpactFeedbackStyle.Medium, at: 0 },
      { kind: 'impact', style: Haptics.ImpactFeedbackStyle.Medium, at: 85 },
    ],
    animation: {
      cover: {
        scaleFrom: 0.97,
        scaleTo: 1,
        rotateFrom: -5,
        rotateTo: 0,
        spring: SPRING.press,
      },
      overlay: { id: 'scanline', enter: TIMING.snap, exit: TIMING.snap, holdMs: 70 },
      durationMs: 300,
    },
  },

  /**
   * Music — "The Needle Drop"
   * Sleeve spins to a stop while a tonearm swings in and touches the edge.
   * A full 360 in under 400ms is the tight constraint here.
   */
  music: {
    sound: 'needle_drop',
    haptics: [
      { kind: 'impact', style: Haptics.ImpactFeedbackStyle.Medium, at: 0 },
      { kind: 'impact', style: Haptics.ImpactFeedbackStyle.Soft, at: 150 },
      { kind: 'impact', style: Haptics.ImpactFeedbackStyle.Soft, at: 230 },
    ],
    animation: {
      cover: {
        scaleFrom: 0.94,
        scaleTo: 1,
        rotateFrom: -360,
        rotateTo: 0,
        spring: SPRING.settle,
      },
      overlay: { id: 'tonearm', enter: TIMING.fastIn, exit: TIMING.fastOut, holdMs: 140 },
      durationMs: 390,
    },
  },

  /**
   * Events — "The Wax Seal Stamp"
   * Card presses into the paper, seal slams the corner. Success notification
   * rather than an impact: this is a completion, and it should feel final.
   */
  event: {
    sound: 'stamp_thud',
    haptics: [
      { kind: 'notify', style: Haptics.NotificationFeedbackType.Success, at: 80 },
    ],
    animation: {
      cover: {
        scaleFrom: 1,
        scaleTo: 0.985,
        spring: SPRING.flat,
      },
      overlay: { id: 'seal', enter: TIMING.snap, exit: TIMING.fastOut, holdMs: 200 },
      durationMs: 400,
    },
  },

  /**
   * Mosaic — "The Printing Press"
   * Screen-level: tiles lift, shuffle, slam into the grid together. Three light
   * pulses build to one heavy landing.
   */
  mosaic: {
    sound: 'typewriter_press',
    haptics: [
      { kind: 'impact', style: Haptics.ImpactFeedbackStyle.Light, at: 0 },
      { kind: 'impact', style: Haptics.ImpactFeedbackStyle.Light, at: 70 },
      { kind: 'impact', style: Haptics.ImpactFeedbackStyle.Light, at: 140 },
      { kind: 'impact', style: Haptics.ImpactFeedbackStyle.Heavy, at: 250 },
    ],
    animation: {
      cover: {
        scaleFrom: 1.06,
        scaleTo: 1,
        translateYFrom: -14,
        spring: SPRING.press,
      },
      durationMs: 400,
    },
  },
};

/* ------------------------------------------------------------------ *
 * Sound pool
 *
 * Loaded once and rewound on replay. `require` is static so the bundler can
 * resolve the assets; a missing file degrades to haptics-only rather than
 * throwing.
 * ------------------------------------------------------------------ */

const SOURCES: Record<string, AVPlaybackSource | undefined> = {
  page_turn: safeRequire(() => require('../../assets/audio/page_turn.mp3')),
  ticket_punch: safeRequire(() => require('../../assets/audio/ticket_punch.mp3')),
  dial_click: safeRequire(() => require('../../assets/audio/dial_click.mp3')),
  needle_drop: safeRequire(() => require('../../assets/audio/needle_drop.mp3')),
  stamp_thud: safeRequire(() => require('../../assets/audio/stamp_thud.mp3')),
  typewriter_press: safeRequire(() => require('../../assets/audio/typewriter_press.mp3')),
};

function safeRequire(fn: () => AVPlaybackSource): AVPlaybackSource | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

const pool = new Map<string, Audio.Sound>();
let audioReady = false;
let preloading: Promise<void> | null = null;

/** Effects should never interrupt the user's own music. */
async function configureAudioMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.InterruptionModeAndroid.DuckOthers,
      interruptionModeIOS: Audio.InterruptionModeIOS.MixWithOthers,
    });
  } catch {
    /* Non-fatal: playback may still work, and haptics are unaffected. */
  }
}

/**
 * Call once at app start, after the splash. Idempotent and safe to await
 * anywhere — concurrent callers share one in-flight promise.
 */
export async function preloadMediaSounds(): Promise<void> {
  if (audioReady) return;
  if (preloading) return preloading;

  preloading = (async () => {
    await configureAudioMode();
    await Promise.all(
      Object.entries(SOURCES).map(async ([key, source]) => {
        if (!source) return;
        try {
          const { sound } = await Audio.Sound.createAsync(source, {
            volume: 0.45,
            shouldPlay: false,
          });
          pool.set(key, sound);
        } catch {
          /* Leave it out of the pool; this effect runs haptics-only. */
        }
      })
    );
    audioReady = true;
    preloading = null;
  })();

  return preloading;
}

/** Release every loaded sound. Call on teardown or memory warning. */
export async function unloadMediaSounds(): Promise<void> {
  await Promise.all(
    Array.from(pool.values()).map((s) => s.unloadAsync().catch(() => undefined))
  );
  pool.clear();
  audioReady = false;
}

async function playCue(key?: string): Promise<boolean> {
  if (!key) return false;
  const sound = pool.get(key);
  if (!sound) return false;
  try {
    /* Rewind rather than reload — a second log fires within the same second. */
    await sound.setPositionAsync(0);
    await sound.playAsync();
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Haptics
 * ------------------------------------------------------------------ */

const timers = new Set<ReturnType<typeof setTimeout>>();

function fire(step: HapticStep): void {
  const run = () => {
    if (step.kind === 'impact') {
      Haptics.impactAsync(step.style).catch(() => undefined);
    } else {
      Haptics.notificationAsync(step.style).catch(() => undefined);
    }
  };

  if (step.at === 0) {
    run();
    return;
  }
  const id = setTimeout(() => {
    timers.delete(id);
    run();
  }, step.at);
  timers.add(id);
}

/**
 * Web has no haptic API, and Android's coarser motor turns a three-pulse
 * sequence into a buzz — so on Android we keep only the first and last step.
 */
function hapticsFor(steps: HapticStep[]): HapticStep[] {
  if (Platform.OS === 'web') return [];
  if (Platform.OS === 'android' && steps.length > 2) {
    return [steps[0], steps[steps.length - 1]];
  }
  return steps;
}

/** Cancel pending haptic steps — e.g. if the screen unmounts mid-effect. */
export function cancelPendingHaptics(): void {
  timers.forEach(clearTimeout);
  timers.clear();
}

/* ------------------------------------------------------------------ *
 * Public trigger
 * ------------------------------------------------------------------ */

/**
 * Fires the haptic pattern and sound for a media type, and returns the
 * animation config for the component to drive.
 *
 * Haptics fire synchronously so the tap feels immediate; audio is awaited only
 * to report whether it played. Never throws.
 */
export async function triggerMediaLogEffect(
  mediaType: EffectKey,
  options?: { silent?: boolean }
): Promise<TriggerResult> {
  const recipe = RECIPES[mediaType] ?? RECIPES.book;

  hapticsFor(recipe.haptics).forEach(fire);

  let soundPlayed = false;
  if (!options?.silent) {
    if (!audioReady) {
      /* First log of the session: don't block the animation on a cold pool. */
      preloadMediaSounds().then(() => playCue(recipe.sound));
    } else {
      soundPlayed = await playCue(recipe.sound);
    }
  }

  return { animation: recipe.animation, soundPlayed };
}

/** Config without side effects — for previews, tests and Storybook. */
export function getMediaAnimation(mediaType: EffectKey): MediaAnimationConfig {
  return (RECIPES[mediaType] ?? RECIPES.book).animation;
}

/* ------------------------------------------------------------------ *
 * Reanimated helpers
 *
 * Worklet-safe builders so components don't restate the sequences. Each returns
 * a value to assign to a shared value inside the trigger.
 * ------------------------------------------------------------------ */

/** Artwork scale: start compressed or expanded, spring to rest. */
export function coverScaleIn(cfg: MediaAnimationConfig) {
  'worklet';
  return withSequence(
    withTiming(cfg.cover.scaleFrom, { duration: 0 }),
    withSpring(cfg.cover.scaleTo, cfg.cover.spring)
  );
}

/** Rotation for the dial click and the needle drop. */
export function coverRotateIn(cfg: MediaAnimationConfig) {
  'worklet';
  const from = cfg.cover.rotateFrom ?? 0;
  const to = cfg.cover.rotateTo ?? 0;
  return withSequence(
    withTiming(from, { duration: 0 }),
    withSpring(to, cfg.cover.spring)
  );
}

/** Overlay opacity: in, hold, out. Returns 0 immediately when there is none. */
export function overlayPulse(cfg: MediaAnimationConfig) {
  'worklet';
  if (!cfg.overlay) return withTiming(0, { duration: 0 });
  return withSequence(
    withTiming(1, cfg.overlay.enter),
    withDelay(cfg.overlay.holdMs, withTiming(0, cfg.overlay.exit))
  );
}

/** The punched hole in the film ticket: collapses as it fades. */
export function punchCollapse() {
  'worklet';
  return withSequence(
    withTiming(1, { duration: 0 }),
    withDelay(90, withTiming(0, { duration: 130, easing: Easing.in(Easing.cubic) }))
  );
}
