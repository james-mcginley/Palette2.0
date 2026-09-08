import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';

const SPACING = 24;
const DOT_SIZE = 2;

interface DotGridProps {
  style?: StyleProp<ViewStyle>;
}

/** EDITORIAL_SYSTEM.md §2: "Page is `--paper` with a `--paper-line` dot
 *  grid at 24px." Plain Views rather than a tiled image — a 2px dot at
 *  fixed spacing is cheap enough to lay out directly, and it's one fewer
 *  generated asset to keep in sync with the spacing constant. */
export function DotGrid({ style }: DotGridProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const dots = useMemo(() => {
    if (!size.width || !size.height) return [];
    const cols = Math.floor(size.width / SPACING);
    const rows = Math.floor(size.height / SPACING);
    const out: { key: string; top: number; left: number }[] = [];
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        out.push({ key: `${r}-${c}`, top: r * SPACING, left: c * SPACING });
      }
    }
    return out;
  }, [size.width, size.height]);

  return (
    <View onLayout={onLayout} pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {dots.map((d) => (
        <View key={d.key} style={[styles.dot, { top: d.top, left: d.left }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: colors.paperLine },
});
