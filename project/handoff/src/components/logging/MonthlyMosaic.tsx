/**
 * MonthlyMosaic — "The Printing Press"
 *
 * Tiles lift off the page with a shadow, jitter in mid-air, then slam into the
 * grid row by row, 50ms apart. Three Light pulses build to one Heavy landing.
 *
 * Two decisions worth knowing:
 *
 *  - Jitter is seeded from the item id, not `Math.random()`. A grid that
 *    re-jitters on every render stops feeling like a printed object.
 *  - Haptics fire per row, not per tile. A 4-column grid would fire 4 pulses in
 *    the same frame and read as one long buzz.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { EASE_OUT, SPRINGS, useLogSound } from './logging.shared';

const LIFT_MS = 180;
const SHUFFLE_MS = 300;
const ROW_STAGGER_MS = 50;
const COLUMNS = 3;

export interface MosaicItem {
  id: string;
  render: () => React.ReactNode;
}

export interface MonthlyMosaicProps {
  items: MosaicItem[];
  /** Flip to true to run the generation sequence. */
  generating: boolean;
  onGenerated?: () => void;
  columns?: number;
  style?: StyleProp<ViewStyle>;
}

/** Deterministic ±2deg from the id, so a tile always tilts the same way. */
function seededJitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 41) - 20) / 10;
}

export function MonthlyMosaic({
  items,
  generating,
  onGenerated,
  columns = COLUMNS,
  style,
}: MonthlyMosaicProps) {
  const playCue = useLogSound('typewriter_press');

  const rowCount = Math.max(1, Math.ceil(items.length / columns));

  const runHaptics = useCallback(() => {
    const light = () =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const heavy = () =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);

    playCue();

    const slamStart = LIFT_MS + SHUFFLE_MS;
    /* One pulse per row, capped at three, then the landing. Android's motor
       smears anything denser than this into a single buzz. */
    const pulses = Platform.OS === 'android' ? 1 : Math.min(3, rowCount);
    for (let r = 0; r < pulses; r++) {
      setTimeout(light, slamStart + r * ROW_STAGGER_MS);
    }
    setTimeout(heavy, slamStart + rowCount * ROW_STAGGER_MS);
    if (onGenerated) {
      setTimeout(onGenerated, slamStart + rowCount * ROW_STAGGER_MS + 120);
    }
  }, [onGenerated, playCue, rowCount]);

  useEffect(() => {
    if (generating) runHaptics();
  }, [generating, runHaptics]);

  return (
    <View style={[styles.grid, style]}>
      {items.map((item, index) => (
        <MosaicTile
          key={item.id}
          id={item.id}
          row={Math.floor(index / columns)}
          columns={columns}
          generating={generating}
        >
          {item.render()}
        </MosaicTile>
      ))}
    </View>
  );
}

MonthlyMosaic.displayName = 'MonthlyMosaic';

interface MosaicTileProps {
  id: string;
  row: number;
  columns: number;
  generating: boolean;
  children: React.ReactNode;
}

function MosaicTile({ id, row, columns, generating, children }: MosaicTileProps) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const shadow = useSharedValue(0);

  const jitter = useMemo(() => seededJitter(id), [id]);

  useEffect(() => {
    if (!generating) return;

    const slamDelay = LIFT_MS + SHUFFLE_MS + row * ROW_STAGGER_MS;

    /* Lift, hold through the shuffle, then slam back flat. */
    scale.value = withSequence(
      withTiming(1.05, { duration: LIFT_MS, easing: EASE_OUT }),
      withTiming(1.05, { duration: SHUFFLE_MS + row * ROW_STAGGER_MS }),
      withSpring(1, SPRINGS.weighty)
    );

    shadow.value = withSequence(
      withTiming(0.3, { duration: LIFT_MS, easing: EASE_OUT }),
      withTiming(0.3, { duration: SHUFFLE_MS + row * ROW_STAGGER_MS }),
      withTiming(0, { duration: 200, easing: EASE_OUT })
    );

    rotate.value = withSequence(
      withDelay(LIFT_MS, withTiming(jitter, { duration: 100 })),
      withTiming(-jitter * 0.6, { duration: 100 }),
      withTiming(jitter * 0.4, { duration: 100 }),
      withDelay(row * ROW_STAGGER_MS, withSpring(0, SPRINGS.weighty))
    );
  }, [generating, jitter, rotate, row, scale, shadow]);

  const tileStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotateZ: `${rotate.value}deg` }],
    shadowOpacity: shadow.value,
    shadowRadius: 10 * shadow.value + 1,
    shadowOffset: { width: 0, height: 6 * shadow.value },
    elevation: 12 * shadow.value,
  }));

  return (
    <Animated.View
      style={[styles.tile, { width: `${100 / columns}%` }, tileStyle]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    padding: 3,
    shadowColor: '#0A0A08',
  },
});
