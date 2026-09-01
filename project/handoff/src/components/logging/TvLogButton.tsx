/**
 * TvLogButton — "The Dial Click"
 *
 * The poster rotates a few degrees into position like a channel dial finding
 * its detent, with a CRT scanline collapsing across the artwork at the apex.
 *
 * Two Medium pulses 100ms apart read as one mechanical click-click. On Android
 * the coarser motor smears rapid pulses, so it gets a single Medium instead.
 */

import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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

import { CREAM, EASE_IN, EASE_OUT, SPRINGS, useLogSound } from './logging.shared';

const CLICK_GAP_MS = 100;
const FLASH_MS = 100;

export interface TvLogButtonProps {
  children: React.ReactNode;
  onLogged?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TvLogButton({ children, onLogged, disabled, style }: TvLogButtonProps) {
  const rotate = useSharedValue(0);
  const flashScaleY = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  const playCue = useLogSound('dial_click');

  const clickHaptics = useCallback(() => {
    const medium = () =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    medium();
    playCue();
    if (Platform.OS !== 'android') {
      setTimeout(medium, CLICK_GAP_MS);
    }
  }, [playCue]);

  const handlePress = useCallback(() => {
    if (disabled) return;

    clickHaptics();

    /* Low damping so it overshoots and settles — a detent, not a slide. */
    rotate.value = withSequence(
      withTiming(-8, { duration: 0 }),
      withSpring(0, SPRINGS.dial, (finished) => {
        if (finished && onLogged) runOnJS(onLogged)();
      })
    );

    /* Scanline collapses vertically into the artwork rather than sweeping it. */
    flashOpacity.value = withSequence(
      withTiming(0.55, { duration: 40, easing: EASE_OUT }),
      withDelay(30, withTiming(0, { duration: FLASH_MS, easing: EASE_IN }))
    );
    flashScaleY.value = withSequence(
      withTiming(1, { duration: 40, easing: EASE_OUT }),
      withTiming(0, { duration: FLASH_MS, easing: EASE_IN })
    );
  }, [clickHaptics, disabled, flashOpacity, flashScaleY, onLogged, rotate]);

  const posterStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotate.value}deg` }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
    transform: [{ scaleY: flashScaleY.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Log this series"
      style={style}
    >
      <View style={styles.wrap}>
        <Animated.View style={posterStyle}>{children}</Animated.View>
        <Animated.View style={[styles.scanline, flashStyle]} pointerEvents="none" />
      </View>
    </Pressable>
  );
}

TvLogButton.displayName = 'TvLogButton';

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden' },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '46%',
    height: 10,
    backgroundColor: CREAM,
  },
});
