import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useLogbookSpreads, type LogbookSpread } from '@/lib/api/logbook';
import { LogbookSpreadView } from '@/components/logbook/LogbookSpreadView';
import { colors, spacing, textStyles } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Logbook'>;

const TURN_MS = 420;
const TURN_EASE = Easing.bezier(0.22, 0.61, 0.36, 1);
const COMPLETE_THRESHOLD = 0.35;

type Direction = 'forward' | 'backward';

/**
 * EDITORIAL_SYSTEM.md §2's page turn — "the interaction that makes it worth
 * building." One deliberate simplification: a full two-page spread turns as
 * a single rigid unit around the spine, rather than one page (recto/verso)
 * turning independently while its facing page stays put. True book physics
 * needs correctly pre-mirrored back-face content per page and careful
 * z-ordering across at least three simultaneous leaves; here "pages are
 * weeks" is implemented as "one week is one flippable card," which still
 * delivers everything the doc calls the actual point — perspective,
 * spine-anchored rotateY driven by the finger, the 35% commit threshold,
 * the haptic at the 90° crossing — without that much larger, harder-to-
 * verify piece of 3D layout.
 */
export function LogbookScreen({ route }: Props) {
  const { width } = useWindowDimensions();
  const { spreads, isLoading } = useLogbookSpreads();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [revealSide, setRevealSide] = useState<Direction | null>(null);
  const initialized = useRef(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const dragX = useSharedValue(0);
  const hasFiredHaptic = useSharedValue(false);
  const lastRevealSide = useSharedValue<Direction | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(false));
  }, []);

  useEffect(() => {
    if (!initialized.current && spreads.length > 0) {
      // Land on the most recent week, like opening a diary to its last entry.
      setCurrentIndex(spreads.length - 1);
      initialized.current = true;
    }
  }, [spreads.length]);

  useEffect(() => {
    if (typeof route.params?.jumpToIndex === 'number') {
      setCurrentIndex(route.params.jumpToIndex);
      dragX.value = 0;
    }
    // Only re-run when the param itself changes — re-selecting the same
    // week from the year grid shouldn't reset the current page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.jumpToIndex]);

  const canGoForward = currentIndex < spreads.length - 1;
  const canGoBackward = currentIndex > 0;

  const commit = (direction: Direction) => {
    setCurrentIndex((i) => i + (direction === 'forward' ? 1 : -1));
    dragX.value = 0;
    hasFiredHaptic.value = false;
    lastRevealSide.value = null;
    setRevealSide(null);
  };

  const turn = (direction: Direction) => {
    if (direction === 'forward' && !canGoForward) return;
    if (direction === 'backward' && !canGoBackward) return;
    const target = direction === 'forward' ? -width : width;
    dragX.value = withTiming(target, { duration: TURN_MS, easing: TURN_EASE }, (finished) => {
      if (finished) runOnJS(commit)(direction);
    });
  };

  const pan = Gesture.Pan()
    .enabled(!reduceMotion)
    .onUpdate((e) => {
      const forward = e.translationX < 0;
      if (forward && !canGoForward) return;
      if (!forward && !canGoBackward) return;
      dragX.value = Math.max(-width, Math.min(width, e.translationX));
    })
    .onEnd((e) => {
      const forward = e.translationX < 0;
      if ((forward && !canGoForward) || (!forward && !canGoBackward)) {
        dragX.value = withTiming(0, { duration: TURN_MS, easing: TURN_EASE });
        return;
      }
      const progress = Math.abs(dragX.value) / width;
      if (progress > COMPLETE_THRESHOLD) {
        const target = forward ? -width : width;
        dragX.value = withTiming(target, { duration: TURN_MS, easing: TURN_EASE }, (finished) => {
          if (finished) runOnJS(commit)(forward ? 'forward' : 'backward');
        });
      } else {
        dragX.value = withTiming(0, { duration: TURN_MS, easing: TURN_EASE });
      }
    });

  useAnimatedReaction(
    () => dragX.value,
    (current) => {
      const progress = Math.abs(current) / width;
      const dir: Direction | null = current < -2 ? 'forward' : current > 2 ? 'backward' : null;
      // Only cross the JS bridge when the derived direction actually
      // changes — dragX updates every frame of the gesture, and this
      // reaction runs alongside it, so an unconditional runOnJS here would
      // be a JS-thread hop per frame for no visible benefit.
      if (dir !== lastRevealSide.value) {
        lastRevealSide.value = dir;
        runOnJS(setRevealSide)(dir);
      }

      if (progress > 0.5 && !hasFiredHaptic.value) {
        hasFiredHaptic.value = true;
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      } else if (progress < 0.4 && hasFiredHaptic.value) {
        hasFiredHaptic.value = false;
      }
    },
    [width]
  );

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = (dragX.value / width) * 180;
    return {
      transform: [{ perspective: 1600 }, { rotateY: `${rotateY}deg` }],
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = (dragX.value / width) * 180 + 180;
    return {
      transform: [{ perspective: 1600 }, { rotateY: `${rotateY}deg` }],
    };
  });

  if (isLoading || reduceMotion === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const current = spreads[currentIndex];
  const revealed = revealSide === 'forward' ? spreads[currentIndex + 1] : revealSide === 'backward' ? spreads[currentIndex - 1] : null;

  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Nothing logged yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.closeLink}>Close</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('LogbookYear')} accessibilityRole="button">
          <Text style={styles.yearLink}>Year view</Text>
        </Pressable>
      </View>

      <View style={styles.bookArea}>
        {revealed && (
          <View style={StyleSheet.absoluteFill}>
            <LogbookSpreadView spread={revealed} />
          </View>
        )}

        {reduceMotion ? (
          <ReducedMotionSpread current={current} canGoForward={canGoForward} canGoBackward={canGoBackward} onTurn={turn} />
        ) : (
          <GestureDetector gesture={pan}>
            <View style={StyleSheet.absoluteFill}>
              <Animated.View style={[styles.face, { backfaceVisibility: 'hidden' }, frontStyle]}>
                <LogbookSpreadView spread={current} />
              </Animated.View>
              <Animated.View style={[styles.face, styles.back, { backfaceVisibility: 'hidden' }, backStyle]} pointerEvents="none" />

              {/* Tap the outer third of either page to turn without dragging. */}
              <View style={styles.tapZones} pointerEvents="box-none">
                <Pressable style={styles.tapZoneLeft} onPress={() => turn('backward')} accessibilityLabel="Previous week" />
                <Pressable style={styles.tapZoneRight} onPress={() => turn('forward')} accessibilityLabel="Next week" />
              </View>
            </View>
          </GestureDetector>
        )}
      </View>
    </View>
  );
}

interface ReducedMotionSpreadProps {
  current: LogbookSpread;
  canGoForward: boolean;
  canGoBackward: boolean;
  onTurn: (direction: Direction) => void;
}

/** "Reduce-motion... replace with a 180ms cross-fade and slide. The gesture
 *  and the chronology still work; only the flourish goes." No 3D transform
 *  at all here — plain opacity/translateX buttons instead of a gesture,
 *  since a drag-to-rotate interaction is itself the motion being reduced. */
function ReducedMotionSpread({ current, canGoForward, canGoBackward, onTurn }: ReducedMotionSpreadProps) {
  const opacity = useSharedValue(1);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const handleTurn = (direction: Direction) => {
    opacity.value = withTiming(0, { duration: 90 }, (finished) => {
      if (finished) {
        runOnJS(onTurn)(direction);
        opacity.value = withTiming(1, { duration: 90 });
      }
    });
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
        <LogbookSpreadView spread={current} />
      </Animated.View>
      <View style={styles.reducedMotionControls}>
        <Pressable style={styles.reducedButton} disabled={!canGoBackward} onPress={() => handleTurn('backward')}>
          <Text style={[styles.reducedButtonLabel, !canGoBackward && styles.reducedButtonDisabled]}>‹ Prev</Text>
        </Pressable>
        <Pressable style={styles.reducedButton} disabled={!canGoForward} onPress={() => handleTurn('forward')}>
          <Text style={[styles.reducedButtonLabel, !canGoForward && styles.reducedButtonDisabled]}>Next ›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.deskGround },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.deskGround },
  emptyText: { ...textStyles.bodySm, color: colors.textSecondary },
  glow: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.amberSoft,
    opacity: 0.5,
  },
  header: { padding: spacing[4], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closeLink: { ...textStyles.caption, color: colors.textSecondary },
  yearLink: { ...textStyles.caption, color: colors.amber },
  bookArea: { flex: 1, margin: spacing[5], marginTop: 0 },
  face: { ...StyleSheet.absoluteFillObject },
  back: { backgroundColor: colors.paperShade, opacity: 0.94 },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  tapZoneLeft: { width: '33%' },
  tapZoneRight: { width: '33%', marginLeft: 'auto' },
  reducedMotionControls: {
    position: 'absolute', bottom: spacing[4], left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing[4],
  },
  reducedButton: { padding: spacing[3] },
  reducedButtonLabel: { ...textStyles.bodyStrong, color: colors.textPrimary },
  reducedButtonDisabled: { opacity: 0.3 },
});
