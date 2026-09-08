import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import { Cover } from '@/components/Cover';
import { Grain } from '@/components/Grain';
import type { DiscoverTile } from '@/lib/discoverGrid';

interface FeatureTileProps {
  tile: Extract<DiscoverTile, { kind: 'feature' }>;
  onPress: () => void;
}

/**
 * EDITORIAL_SYSTEM.md §1 tile A: full-bleed 4:5 image, title over a gradient
 * scrim starting ~55% down, not a solid bar. The doc's own grading recipe
 * (`saturate(0.82) contrast(1.08) brightness(0.86)` + a warm wash) has no RN
 * equivalent without a pixel-filter native module; the scrim plus a subtle
 * amber wash approximates the same "graded still, not a raw photo" feel
 * without adding that dependency for one effect.
 */
export function FeatureTile({ tile, onPress }: FeatureTileProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.root, pressed && styles.pressed]}>
      <Cover imageUrl={tile.imageUrl} title={tile.title} style={StyleSheet.absoluteFillObject} borderRadius={radii.md} />
      <View style={[styles.warmWash, { borderRadius: radii.md }]} pointerEvents="none" />
      <Grain opacity={0.16} style={{ borderRadius: radii.md }} />
      <LinearGradient
        colors={['transparent', 'rgba(16,14,12,0.94)']}
        locations={[0.4, 1]}
        style={[styles.scrim, { borderRadius: radii.md }]}
        pointerEvents="none"
      />
      <View style={styles.textBlock}>
        <Text style={styles.eyebrow}>Collection</Text>
        <Text style={styles.title} numberOfLines={3}>{tile.title}</Text>
        {tile.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>{tile.subtitle}</Text>
        ) : null}
        <Text style={styles.meta}>{tile.meta}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    aspectRatio: 4 / 5,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  pressed: { opacity: 0.94 },
  warmWash: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.amberSoft },
  scrim: { ...StyleSheet.absoluteFillObject },
  textBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing[4],
    gap: 4,
  },
  eyebrow: { ...textStyles.monoSm, color: colors.amber, textTransform: 'uppercase', letterSpacing: 2 },
  title: { ...textStyles.displayMd, color: colors.textPrimary },
  subtitle: { ...textStyles.bodySm, color: colors.textSecondary, fontStyle: 'italic' },
  meta: { ...textStyles.caption, color: colors.textSecondary, marginTop: 2 },
});
