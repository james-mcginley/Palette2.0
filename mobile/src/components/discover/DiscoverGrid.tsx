import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { DiscoverTile } from '@/lib/discoverGrid';
import { FeatureTile } from './FeatureTile';
import { CollectionTile } from './CollectionTile';
import { RankedTile } from './RankedTile';
import { StandardTile } from './StandardTile';

const GUTTER = 12;

type Row =
  | { span: 'full'; tile: DiscoverTile }
  | { span: 'half'; left: DiscoverTile; right?: DiscoverTile };

/**
 * EDITORIAL_SYSTEM.md §1 grid rhythm: Feature and Collection are 2-col span
 * (their own row); Ranked and Standard are 1-col and pair up two-per-row
 * regardless of which of the two kinds they are ("C D" and "D D" are both
 * valid rows in the doc's own example). A lone half-width tile at a
 * full-width boundary, or at the end of the feed, renders alone rather than
 * waiting for a partner that isn't coming.
 */
function layoutRows(tiles: DiscoverTile[]): Row[] {
  const rows: Row[] = [];
  let pendingHalf: DiscoverTile | null = null;

  const flushHalf = () => {
    if (pendingHalf) {
      rows.push({ span: 'half', left: pendingHalf });
      pendingHalf = null;
    }
  };

  for (const tile of tiles) {
    const isFull = tile.kind === 'feature' || tile.kind === 'collection';
    if (isFull) {
      flushHalf();
      rows.push({ span: 'full', tile });
    } else if (pendingHalf) {
      rows.push({ span: 'half', left: pendingHalf, right: tile });
      pendingHalf = null;
    } else {
      pendingHalf = tile;
    }
  }
  flushHalf();
  return rows;
}

function Tile({ tile, onOpenMedia, onOpenCuration }: {
  tile: DiscoverTile;
  onOpenMedia: (mediaId: string) => void;
  onOpenCuration: (curationId: string, title: string) => void;
}) {
  switch (tile.kind) {
    case 'feature':
      return <FeatureTile tile={tile} onPress={() => onOpenCuration(tile.curationId, tile.title)} />;
    case 'collection':
      return (
        <CollectionTile
          tile={tile}
          onOpenCollection={() => onOpenCuration(tile.curationId, tile.title)}
          onOpenItem={onOpenMedia}
        />
      );
    case 'ranked':
      return <RankedTile tile={tile} onPress={() => onOpenCuration(tile.curationId, tile.title)} />;
    case 'standard':
      return <StandardTile tile={tile} onPress={() => onOpenMedia(tile.mediaId)} />;
  }
}

interface DiscoverGridProps {
  tiles: DiscoverTile[];
}

export function DiscoverGrid({ tiles }: DiscoverGridProps) {
  const rows = useMemo(() => layoutRows(tiles), [tiles]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const onOpenMedia = (mediaId: string) => navigation.navigate('MediaDetail', { mediaId });
  const onOpenCuration = (curationId: string, title: string) =>
    navigation.navigate('CurationDetail', { curationId, title });

  return (
    <View style={styles.root}>
      {rows.map((row, i) =>
        row.span === 'full' ? (
          <View key={i} style={styles.row}>
            <Tile tile={row.tile} onOpenMedia={onOpenMedia} onOpenCuration={onOpenCuration} />
          </View>
        ) : (
          <View key={i} style={[styles.row, styles.halfRow]}>
            <View style={styles.half}>
              <Tile tile={row.left} onOpenMedia={onOpenMedia} onOpenCuration={onOpenCuration} />
            </View>
            {row.right ? (
              <View style={styles.half}>
                <Tile tile={row.right} onOpenMedia={onOpenMedia} onOpenCuration={onOpenCuration} />
              </View>
            ) : (
              <View style={styles.half} />
            )}
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: GUTTER },
  row: {},
  halfRow: { flexDirection: 'row', gap: GUTTER },
  half: { flex: 1 },
});
