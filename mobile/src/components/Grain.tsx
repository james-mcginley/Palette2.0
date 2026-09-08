import React, { useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

/**
 * EDITORIAL_SYSTEM.md §0's grain texture, ported off the web's live SVG
 * turbulence filter — React Native has no filter primitive, and the doc's
 * own performance note ("do not attach a live SVG filter to a scrolling
 * list — it re-rasterises per frame") points at the same answer either way:
 * render the noise once and reuse it as a texture. `assets/textures/grain.png`
 * is that pre-rendered 128×128 tile (generated once by a build-time script,
 * not regenerated on device); this component just repeats it to fill its
 * parent and dims it to the requested opacity.
 *
 * Tiles are laid out on `onLayout`, not per frame, so cost is one grid build
 * per size change — a handful of <Image> nodes per tile-sized card, not a
 * per-pixel effect.
 */

const TILE_SIZE = 128;
const GRAIN_SOURCE = require('../../assets/textures/grain.png');

interface GrainProps {
  /** 0.16 over imagery, 0.08 on flat surfaces, 0.05 on paper — EDITORIAL_SYSTEM.md §0. */
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}

export function Grain({ opacity = 0.16, style }: GrainProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const tiles = useMemo(() => {
    if (!size.width || !size.height) return [];
    const cols = Math.ceil(size.width / TILE_SIZE);
    const rows = Math.ceil(size.height / TILE_SIZE);
    const out: { key: string; top: number; left: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({ key: `${r}-${c}`, top: r * TILE_SIZE, left: c * TILE_SIZE });
      }
    }
    return out;
  }, [size.width, size.height]);

  return (
    <View
      onLayout={onLayout}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.clip, { opacity }, style]}
    >
      {tiles.map((t) => (
        <Image
          key={t.key}
          source={GRAIN_SOURCE}
          style={{ position: 'absolute', top: t.top, left: t.left, width: TILE_SIZE, height: TILE_SIZE }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
