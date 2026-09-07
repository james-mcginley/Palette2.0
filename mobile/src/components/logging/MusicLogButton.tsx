/**
 * MusicLogButton — "The Needle Drop"
 *
 * The sleeve spins to a stop over 600ms while a tonearm swings down from the
 * top-right and settles on the edge; the sleeve gives a small bounce as the
 * needle lands.
 *
 * A spec note worth flagging: iOS has no sustained-vibration API, so the brief's
 * "continuous Light while spinning" is built as three Light taps spread across
 * the spin. It reads as texture rather than as three separate events, which is
 * the closest an impact-only API gets to a rumble.
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { EASE_OUT, INK, SPOT_RED, SPRINGS, useLogSound } from './logging.shared';

const SPIN_MS = 600;
const ARM_MS = 400;

export interface MusicLogButtonProps {
  children: React.ReactNode;
  onLogged?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function MusicLogButton({ children, onLogged, disabled, style }: MusicLogButtonProps) {
  const spin = useSharedValue(0);
  const scale = useSharedValue(1);
  const arm = useSharedValue(-30);
  const armOpacity = useSharedValue(0);

  const playCue = useLogSound('needle_drop');

  const spinHaptics = useCallback(() => {
    const light = () =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    light();
    setTimeout(light, 180);
    setTimeout(light, 340);
    playCue();
  }, [playCue]);

  const lockHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, []);

  const handlePress = useCallback(() => {
    if (disabled) return;

    spinHaptics();

    spin.value = withSequence(
      withTiming(360, { duration: 0 }),
      withTiming(0, { duration: SPIN_MS, easing: EASE_OUT })
    );

    armOpacity.value = withTiming(1, { duration: 120, easing: EASE_OUT });

    arm.value = withSequence(
      withTiming(-30, { duration: 0 }),
      withTiming(0, { duration: ARM_MS, easing: EASE_OUT }, (finished) => {
        if (!finished) return;
        runOnJS(lockHaptic)();
        if (onLogged) runOnJS(onLogged)();
      })
    );

    /* Micro-bounce timed to the arm landing, not the spin finishing. */
    scale.value = withSequence(
      withTiming(1, { duration: ARM_MS - 60 }),
      withTiming(0.98, { duration: 60 }),
      withSpring(1, SPRINGS.recoil)
    );
  }, [arm, armOpacity, disabled, lockHaptic, onLogged, scale, spin, spinHaptics]);

  const artStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${spin.value}deg` }, { scale: scale.value }],
  }));

  /* Pivot at the top-right, where a real tonearm is anchored. */
  const armStyle = useAnimatedStyle(() => ({
    opacity: armOpacity.value,
    transform: [{ rotateZ: `${arm.value}deg` }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Log this album"
      style={style}
    >
      <View style={styles.wrap}>
        <Animated.View style={artStyle}>{children}</Animated.View>

        <Animated.View style={[styles.arm, armStyle]} pointerEvents="none">
          <Svg width={70} height={70} viewBox="0 0 70 70">
            <Circle cx="58" cy="12" r="6" fill={INK} />
            <Path d="M58 12 L26 46" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
            <Path d="M26 46 l-6 5" stroke={SPOT_RED} strokeWidth={4.4} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </View>
    </Pressable>
  );
}

MusicLogButton.displayName = 'MusicLogButton';

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  arm: {
    position: 'absolute',
    top: -18,
    right: -18,
    width: 70,
    height: 70,
    /* Rotation origin lives at the pivot circle, so the arm swings from its mount. */
    transformOrigin: '58px 12px',
  },
});
