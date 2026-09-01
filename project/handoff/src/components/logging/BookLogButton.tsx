/**
 * BookLogButton — "The Shelf Slide"
 *
 * Press in and the cover compresses under the thumb. Release and it slides
 * right, out of the hand and onto the shelf, with three ink dust lines puffing
 * off the top corner as it seats.
 *
 * The haptic is a double tap: Light on contact, Soft when it lands. That pair
 * is what sells it as a physical placement rather than a state change.
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';
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

import { EASE_IN, EASE_OUT, INK, SPRINGS, useLogSound } from './logging.shared';

const SLIDE_MS = 220;
const DUST_MS = 300;

export interface BookLogButtonProps {
  children: React.ReactNode;
  onLogged?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BookLogButton({ children, onLogged, disabled, style }: BookLogButtonProps) {
  const scale = useSharedValue(1);
  const slideX = useSharedValue(0);
  const coverOpacity = useSharedValue(1);
  const dust = useSharedValue(0);

  const playCue = useLogSound('page_turn');

  const tapHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, []);

  const landHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => undefined);
    playCue();
  }, [playCue]);

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    tapHaptic();
    scale.value = withSpring(0.92, SPRINGS.weighty);
  }, [disabled, scale, tapHaptic]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(1, SPRINGS.weighty);
  }, [disabled, scale]);

  const handlePress = useCallback(() => {
    if (disabled) return;

    slideX.value = withTiming(20, { duration: SLIDE_MS, easing: EASE_OUT }, (finished) => {
      if (!finished) return;
      /* Dust and the landing haptic fire together, on the frame the slide ends. */
      runOnJS(landHaptic)();
      if (onLogged) runOnJS(onLogged)();
    });

    coverOpacity.value = withTiming(0, { duration: SLIDE_MS, easing: EASE_IN });

    dust.value = withDelay(
      SLIDE_MS,
      withSequence(
        withTiming(1, { duration: 90, easing: EASE_OUT }),
        withTiming(0, { duration: DUST_MS - 90, easing: EASE_IN })
      )
    );
  }, [coverOpacity, disabled, dust, landHaptic, onLogged, slideX]);

  /** Call after the row has re-rendered with the book on the shelf. */
  const reset = useCallback(() => {
    slideX.value = 0;
    coverOpacity.value = 1;
    dust.value = 0;
  }, [coverOpacity, dust, slideX]);

  const coverStyle = useAnimatedStyle(() => ({
    opacity: coverOpacity.value,
    transform: [{ translateX: slideX.value }, { scale: scale.value }],
  }));

  /* Dust rises and fades as it goes, so the puff reads as air not as three marks. */
  const dustStyle = useAnimatedStyle(() => ({
    opacity: dust.value,
    transform: [{ scale: dust.value }, { translateY: -10 * dust.value }],
  }));

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Log this book"
      style={style}
    >
      <View style={styles.wrap} onLayout={undefined}>
        <Animated.View style={coverStyle}>{children}</Animated.View>

        <Animated.View style={[styles.dust, dustStyle]} pointerEvents="none">
          <Svg width={26} height={20} viewBox="0 0 26 20">
            <Line x1="3" y1="15" x2="8" y2="7" stroke={INK} strokeWidth={2} strokeLinecap="round" />
            <Line x1="12" y1="17" x2="14" y2="5" stroke={INK} strokeWidth={2} strokeLinecap="round" />
            <Line x1="20" y1="15" x2="23" y2="8" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </View>
    </Pressable>
  );
}

BookLogButton.displayName = 'BookLogButton';

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  dust: { position: 'absolute', top: -14, right: -8 },
});
