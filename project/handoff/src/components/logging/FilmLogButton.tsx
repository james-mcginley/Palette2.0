/**
 * FilmLogButton — "The Ticket Punch"
 *
 * The poster drops in heavy, a stub flashes over it, a hole punches through the
 * edge, then the stub clears and leaves the poster stamped.
 *
 * The Heavy haptic fires on the punch frame, not on entry. That timing is the
 * whole effect: the thud has to coincide with the hole appearing or it reads as
 * two unrelated events.
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CREAM, EASE_IN, EASE_OUT, INK, MUSTARD, PAPER, SPRINGS, useLogSound } from './logging.shared';

const STUB_IN_MS = 90;
const PUNCH_MS = 150;
const FADE_MS = 200;

export interface FilmLogButtonProps {
  children: React.ReactNode;
  onLogged?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function FilmLogButton({ children, onLogged, disabled, style }: FilmLogButtonProps) {
  const posterScale = useSharedValue(1);
  const stub = useSharedValue(0);
  const punchScale = useSharedValue(2);
  const punchOpacity = useSharedValue(0);

  const playCue = useLogSound('ticket_punch');

  const punchHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    playCue();
  }, [playCue]);

  const handlePress = useCallback(() => {
    if (disabled) return;

    /* Low stiffness, high damping — it lands rather than bounces. */
    posterScale.value = withSequence(
      withTiming(1.1, { duration: 0 }),
      withSpring(1, SPRINGS.heavy)
    );

    stub.value = withSequence(
      withTiming(0.8, { duration: STUB_IN_MS, easing: EASE_OUT }),
      withDelay(PUNCH_MS, withTiming(0, { duration: FADE_MS, easing: EASE_IN }))
    );

    punchOpacity.value = withDelay(
      STUB_IN_MS,
      withSequence(
        withTiming(1, { duration: 0 }),
        withDelay(PUNCH_MS, withTiming(0, { duration: FADE_MS, easing: EASE_IN }))
      )
    );

    punchScale.value = withDelay(
      STUB_IN_MS,
      withSequence(
        withTiming(2, { duration: 0 }),
        withTiming(1, { duration: PUNCH_MS, easing: EASE_OUT }, (finished) => {
          if (!finished) return;
          runOnJS(punchHaptic)();
          if (onLogged) runOnJS(onLogged)();
        })
      )
    );
  }, [disabled, onLogged, posterScale, punchHaptic, punchOpacity, punchScale, stub]);

  const posterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: posterScale.value }],
  }));

  const stubStyle = useAnimatedStyle(() => ({ opacity: stub.value }));

  const punchStyle = useAnimatedStyle(() => ({
    opacity: punchOpacity.value,
    transform: [{ scale: punchScale.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Log this film"
      style={style}
    >
      <View style={styles.wrap}>
        <Animated.View style={posterStyle}>{children}</Animated.View>

        <Animated.View style={[styles.overlay, stubStyle]} pointerEvents="none">
          <Svg width="100%" height="100%" viewBox="0 0 120 70" preserveAspectRatio="none">
            {/* Stub with the notch pair, drawn as one path so the shape stays crisp at any size. */}
            <Path
              d="M4 6 h48 a6 6 0 0 0 12 0 h52 v58 h-52 a6 6 0 0 0 -12 0 h-48 z"
              fill={MUSTARD}
              stroke={INK}
              strokeWidth={2.4}
              strokeLinejoin="round"
            />
            <Path d="M14 24 h30 M14 34 h30 M14 44 h20" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Animated.View>

        {/* The punched hole: paper-coloured, so it reads as an absence not a dot. */}
        <Animated.View style={[styles.punch, punchStyle]} pointerEvents="none" />
      </View>
    </Pressable>
  );
}

FilmLogButton.displayName = 'FilmLogButton';

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject },
  punch: {
    position: 'absolute',
    right: '18%',
    top: '44%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PAPER,
    borderWidth: 1.5,
    borderColor: INK,
  },
});
