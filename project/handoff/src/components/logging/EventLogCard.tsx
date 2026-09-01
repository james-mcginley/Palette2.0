/**
 * EventLogCard — "The Wax Seal Stamp"
 *
 * The card presses into the paper, a wax seal slams the bottom-right corner,
 * and the card recoils as the stamp lifts away.
 *
 * Success notification rather than an impact: logging a gig you actually went to
 * is a completion, and it should feel conclusive rather than percussive.
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

import { CREAM, EASE_OUT, INK, SPOT_RED, SPRINGS, useLogSound } from './logging.shared';

const PRESS_MS = 120;
const SLAM_MS = 150;

export interface EventLogCardProps {
  children: React.ReactNode;
  onLogged?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EventLogCard({ children, onLogged, disabled, style }: EventLogCardProps) {
  const cardScale = useSharedValue(1);
  const sealScale = useSharedValue(3);
  const sealOpacity = useSharedValue(0);

  const playCue = useLogSound('stamp_thud');

  const slamHaptic = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    playCue();
  }, [playCue]);

  const handlePress = useCallback(() => {
    if (disabled) return;

    /* Press in, hold while the seal travels, then recoil as it lifts. */
    cardScale.value = withSequence(
      withTiming(0.95, { duration: PRESS_MS, easing: EASE_OUT }),
      withTiming(0.95, { duration: SLAM_MS }),
      withSpring(1, SPRINGS.recoil)
    );

    sealOpacity.value = withSequence(
      withTiming(0, { duration: PRESS_MS }),
      withTiming(1, { duration: SLAM_MS, easing: EASE_OUT })
    );

    sealScale.value = withSequence(
      withTiming(3, { duration: PRESS_MS }),
      withTiming(1, { duration: SLAM_MS, easing: EASE_OUT }, (finished) => {
        if (!finished) return;
        runOnJS(slamHaptic)();
        if (onLogged) runOnJS(onLogged)();
      })
    );
  }, [cardScale, disabled, onLogged, sealOpacity, sealScale, slamHaptic]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const sealStyle = useAnimatedStyle(() => ({
    opacity: sealOpacity.value,
    transform: [{ scale: sealScale.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Log this event"
      style={style}
    >
      <View style={styles.wrap}>
        <Animated.View style={cardStyle}>{children}</Animated.View>

        <Animated.View style={[styles.seal, sealStyle]} pointerEvents="none">
          <Svg width={52} height={52} viewBox="0 0 52 52">
            {/* Jagged rim: wax squeezed out under the die, not a clean circle. */}
            <Path
              d="M26 2 l4.4 3.2 5.2 -1.8 2.6 4.8 5.4 1 0.2 5.4 4.4 3.4 -2.4 4.9 2.4 4.9 -4.4 3.4 -0.2 5.4 -5.4 1 -2.6 4.8 -5.2 -1.8 -4.4 3.2 -4.4 -3.2 -5.2 1.8 -2.6 -4.8 -5.4 -1 -0.2 -5.4 -4.4 -3.4 2.4 -4.9 -2.4 -4.9 4.4 -3.4 0.2 -5.4 5.4 -1 2.6 -4.8 5.2 1.8 z"
              fill={SPOT_RED}
              stroke={INK}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
            <Circle cx="26" cy="26" r="14" fill="none" stroke={CREAM} strokeWidth={1.6} />
            <Path
              d="M20 20 h8 a5 5 0 0 1 0 10 h-3 v6 h-5 z"
              fill={CREAM}
            />
          </Svg>
        </Animated.View>
      </View>
    </Pressable>
  );
}

EventLogCard.displayName = 'EventLogCard';

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  seal: { position: 'absolute', right: -12, bottom: -12 },
});
