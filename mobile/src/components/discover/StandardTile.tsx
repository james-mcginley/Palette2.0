import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, textStyles } from '@/theme/tokens';
import { Cover } from '@/components/Cover';
import type { DiscoverTile } from '@/lib/discoverGrid';

interface StandardTileProps {
  tile: Extract<DiscoverTile, { kind: 'standard' }>;
  onPress: () => void;
}

/** EDITORIAL_SYSTEM.md §1 tile D — "the workhorse": cover, title, one line
 *  of metadata. No overlay text, no grading; the plain case every other
 *  tile is a variation on. */
export function StandardTile({ tile, onPress }: StandardTileProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.root, pressed && styles.pressed]}>
      <Cover imageUrl={tile.imageUrl} title={tile.title} style={styles.cover} borderRadius={radii.md} />
      <Text style={styles.title} numberOfLines={1}>{tile.title}</Text>
      {tile.creator ? <Text style={styles.meta} numberOfLines={1}>{tile.creator}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {},
  pressed: { opacity: 0.85 },
  cover: { width: '100%', aspectRatio: 2 / 3, backgroundColor: colors.surfaceRaised, marginBottom: 6 },
  title: { ...textStyles.bodyStrong, color: colors.textPrimary },
  meta: { ...textStyles.caption, color: colors.textSecondary },
});
