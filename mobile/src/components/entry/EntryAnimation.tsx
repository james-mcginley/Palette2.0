import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Cover } from '@/components/Cover';
import { Grain } from '@/components/Grain';
import { colors, radii } from '@/theme/tokens';

const DARK_MS = 400;
const RISE_MS = 520;
const STAGGER_MS = 90;
const SETTLE_MS = 800;
const SPREAD_MS = 800;
const DRAW_EASE = Easing.bezier(0.16, 1, 0.3, 1);
const RESTING_ANGLES = [-6, 3, -2, 5, -3];

export interface EntryAnimationCover {
  id: string;
  imageUrl?: string;
  title: string;
}

interface EntryAnimationProps {
  covers: EntryAnimationCover[];
  onDone: () => void;
}

/**
 * EDITORIAL_SYSTEM.md §3, "the polaroid draw" — cold-launch only, skippable,
 * never a loader (the real screen is already mounted beneath this; see
 * TabNavigator). Simplified from the doc in one place: "cards fan into
 * their feed positions" is implemented as fan-and-fade rather than a FLIP
 * animation into each card's actual future list-row coordinates — morphing
 * into real FlatList row positions is a much larger, fragile piece of
 * engineering for a flourish that plays once per cold launch. The
 * interactive rest state (drag-to-discard top card, tilt parallax,
 * long-press lift) described in the same section is a persistent Feed
 * interaction model, not part of the entry sequence itself — not built
 * here; see PLAN.md Phase 7.
 */
export function EntryAnimation({ covers, onDone }: EntryAnimationProps) {
  const { width } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const bgOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);
  const grainOpacity = useSharedValue(0);
  const done = React.useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(false));
  }, []);

  const finish = React.useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (reduceMotion === null) return;

    if (reduceMotion) {
      // "Reduce-motion → 200ms fade" — no cards, no haptics, just a quick
      // cross-fade straight to the screen underneath.
      overlayOpacity.value = withTiming(0, { duration: 200 }, (isFinished) => {
        if (isFinished) runOnJS(finish)();
      });
      return;
    }

    bgOpacity.value = withTiming(1, { duration: DARK_MS });
    const drawEnd = DARK_MS + RISE_MS + (covers.length - 1) * STAGGER_MS;
    grainOpacity.value = withDelay(drawEnd, withTiming(0.16, { duration: SETTLE_MS }));

    const spreadStart = DARK_MS + Math.max(RISE_MS + (covers.length - 1) * STAGGER_MS, 1200) + SETTLE_MS;
    overlayOpacity.value = withDelay(spreadStart, withTiming(0, { duration: SPREAD_MS }, (isFinished) => {
      if (isFinished) runOnJS(finish)();
    }));

    // Four seconds is the hard cap the doc states — a safety timer in case
    // any animation callback above never fires (e.g. app backgrounded
    // mid-sequence and Reanimated pauses callbacks).
    const safety = setTimeout(finish, 4000);
    return () => clearTimeout(safety);
  }, [reduceMotion, covers.length, bgOpacity, grainOpacity, overlayOpacity, finish]);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const grainStyle = useAnimatedStyle(() => ({ opacity: grainOpacity.value }));

  if (reduceMotion === null || covers.length === 0) return null;

  const cardWidth = Math.min(width * 0.42, 180);
  const fanStep = cardWidth * 0.24;
  const stackWidth = cardWidth + fanStep * (covers.length - 1);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, overlayStyle]} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityLabel="Skip intro" accessibilityRole="button" />
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]} pointerEvents="none">
        <View style={styles.glow} />
      </Animated.View>

      {!reduceMotion && (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, grainStyle]} pointerEvents="none">
            <Grain opacity={1} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <View style={[styles.stack, { width: stackWidth, height: cardWidth / (3 / 4) }]} pointerEvents="none">
            {covers.map((cover, i) => (
              <PolaroidCard
                key={cover.id}
                cover={cover}
                index={i}
                cardWidth={cardWidth}
                offsetX={i * fanStep}
              />
            ))}
          </View>
        </>
      )}
    </Animated.View>
  );
}

interface PolaroidCardProps {
  cover: EntryAnimationCover;
  index: number;
  cardWidth: number;
  offsetX: number;
}

function PolaroidCard({ cover, index, cardWidth, offsetX }: PolaroidCardProps) {
  const translateY = useSharedValue(1);
  const rotate = useSharedValue(0);
  const sweep = useSharedValue(-1);
  const restingAngle = RESTING_ANGLES[index % RESTING_ANGLES.length];

  const fireHaptic = React.useCallback(() => {
    const style = index === 0 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(style).catch(() => undefined);
  }, [index]);

  useEffect(() => {
    // Mount-only: this component exists only for the lifetime of the entry
    // sequence, and `index`/`restingAngle` are fixed for a mounted card, so
    // there is no re-run case to guard against here.
    const delay = DARK_MS + index * STAGGER_MS;
    translateY.value = withDelay(delay, withTiming(0, { duration: RISE_MS, easing: DRAW_EASE }, (isFinished) => {
      if (isFinished) runOnJS(fireHaptic)();
    }));
    rotate.value = withDelay(
      delay,
      withSequence(
        withTiming(restingAngle, { duration: RISE_MS, easing: DRAW_EASE }),
        // "The stack breathes: a 2° oscillation damping to rest" — one
        // decaying swing rather than a true spring, since it has to land
        // exactly back on restingAngle for the fan to read as settled.
        withTiming(restingAngle + 2, { duration: 220 }),
        withTiming(restingAngle - 1, { duration: 220 }),
        withTiming(restingAngle, { duration: 260 })
      )
    );
    sweep.value = withDelay(delay, withTiming(1, { duration: RISE_MS + 120, easing: Easing.out(Easing.quad) }));
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    left: offsetX,
    transform: [
      { translateY: translateY.value * 400 },
      { rotateZ: `${rotate.value}deg` },
    ],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: sweep.value > 0 && sweep.value < 1 ? 0.12 : 0,
    transform: [{ translateX: (sweep.value - 0.5) * cardWidth * 2 }, { rotateZ: '30deg' }],
  }));

  return (
    // A shadow and `overflow: hidden` can't live on the same view — iOS
    // clips the shadow along with everything else. Outer view carries the
    // shadow/transform, inner view carries the rounded-corner clip.
    <Animated.View style={[styles.card, { width: cardWidth, zIndex: index }, cardStyle]}>
      <View style={styles.cardClip}>
        <Cover imageUrl={cover.imageUrl} title={cover.title} style={{ width: '100%', aspectRatio: 3 / 4 }} borderRadius={0} />
        <Animated.View style={[styles.sweep, sweepStyle]} pointerEvents="none">
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.surfaceCanvas, alignItems: 'center', justifyContent: 'center', zIndex: 50, elevation: 50 },
  glow: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: colors.amberSoft,
    shadowColor: colors.amber,
    shadowOpacity: 0.4,
    shadowRadius: 120,
  },
  stack: { flexDirection: 'row' },
  card: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  cardClip: { borderRadius: radii.sm, overflow: 'hidden' },
  sweep: { ...StyleSheet.absoluteFillObject, width: 40 },
});
