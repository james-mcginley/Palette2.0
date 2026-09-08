import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, textStyles } from '@/theme/tokens';
import { Cover } from '@/components/Cover';
import { Grain } from '@/components/Grain';
import type { DiscoverTile } from '@/lib/discoverGrid';

interface RankedTileProps {
  tile: Extract<DiscoverTile, { kind: 'ranked' }>;
  onPress: () => void;
}

/**
 * EDITORIAL_SYSTEM.md §1 tile C: "Cover with a large mono numeral
 * bottom-left, half-off the image edge." The numeral here is the list's item
 * count rather than a per-item rank — this tile represents the whole
 * curation (e.g. a "12" reading like "12 Essential Thrillers"), tapping
 * through to the full ranked list on CurationDetailScreen.
 */
export function RankedTile({ tile, onPress }: RankedTileProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.root, pressed && styles.pressed]}>
      <View style={styles.imageBox}>
        <Cover imageUrl={tile.imageUrl} title={tile.title} style={StyleSheet.absoluteFillObject} borderRadius={radii.md} />
        <Grain opacity={0.16} style={{ borderRadius: radii.md }} />
        <View style={styles.numeralWrap}>
          <Text style={styles.numeral}>{tile.count}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{tile.title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {},
  pressed: { opacity: 0.94 },
  // aspectRatio box, own overflow left visible so the numeral can bleed
  // "half off the image edge" — the extra marginBottom below reserves the
  // space it bleeds into, so it never overlaps the title or the next row.
  imageBox: {
    aspectRatio: 4 / 5,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    marginBottom: 18,
  },
  numeralWrap: { position: 'absolute', left: -4, bottom: -16 },
  numeral: {
    ...textStyles.displayLg,
    fontFamily: 'RobotoMono',
    color: colors.textPrimary,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  title: { ...textStyles.caption, color: colors.textSecondary },
});
