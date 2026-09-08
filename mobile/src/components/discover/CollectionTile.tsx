import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import { Cover } from '@/components/Cover';
import { Grain } from '@/components/Grain';
import type { DiscoverTile } from '@/lib/discoverGrid';
import type { MediaType } from '@/lib/types/media';

interface CollectionTileProps {
  tile: Extract<DiscoverTile, { kind: 'collection' }>;
  onOpenCollection: () => void;
  onOpenItem: (mediaId: string) => void;
}

const STAMP_LABEL: Record<MediaType, string> = {
  FILM: 'FILM', TV: 'TV', BOOK: 'BOOK', VINYL: 'LP', CAST: 'CAST', EVENT: 'EVENT',
};

const OVERLAP = 18;

/**
 * EDITORIAL_SYSTEM.md §1 tile B — "the signature tile". Three covers fanned
 * on a warm ground; each is independently tappable into its own detail
 * sheet, and only the tile background opens the collection. Nested
 * Pressables handle that split for free — RN's responder system resolves a
 * touch to the deepest node under the finger, so a tap that lands on a cover
 * never bubbles into the outer tile's onPress.
 */
export function CollectionTile({ tile, onOpenCollection, onOpenItem }: CollectionTileProps) {
  return (
    <Pressable onPress={onOpenCollection} style={({ pressed }) => [styles.root, pressed && styles.pressed]}>
      <Grain opacity={0.08} style={{ borderRadius: radii.md }} />
      <Text style={styles.eyebrow}>Collection</Text>
      <Text style={styles.title} numberOfLines={2}>{tile.title}</Text>

      <View style={styles.fan}>
        {tile.items.map((item, i) => (
          <Pressable
            key={item.id}
            onPress={() => onOpenItem(item.mediaId)}
            style={[
              styles.coverWrap,
              i > 0 && { marginLeft: -OVERLAP },
              { transform: [{ rotate: `${item.rotationDeg}deg` }], zIndex: i },
            ]}
          >
            <Cover imageUrl={item.imageUrl} title="" style={styles.cover} borderRadius={radii.sm} />
            <Text style={styles.stamp}>{STAMP_LABEL[item.mediaType]}</Text>
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    aspectRatio: 3 / 2,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing[4],
    overflow: 'hidden',
  },
  pressed: { opacity: 0.94 },
  eyebrow: { ...textStyles.monoSm, color: colors.amber, textTransform: 'uppercase', letterSpacing: 2 },
  title: { ...textStyles.headingMd, color: colors.textPrimary, marginTop: 4, marginBottom: spacing[3] },
  fan: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 },
  coverWrap: { width: '32%', alignItems: 'center', gap: 4 },
  cover: { width: '100%', aspectRatio: 3 / 4 },
  stamp: { ...textStyles.monoSm, color: colors.textDim, letterSpacing: 1 },
});
