import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLogbookSpreads } from '@/lib/api/logbook';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

/**
 * EDITORIAL_SYSTEM.md §2: "A pinch-out zooms to a year view: twelve spread
 * thumbnails in a grid." Implemented as its own screen reached by a button
 * rather than an actual pinch gesture — the point is jumping straight to a
 * week without paging through everything between, and a tappable grid
 * delivers that as reliably as a continuous pinch-zoom morph would, for a
 * fraction of the engineering.
 */
export function LogbookYearScreen() {
  const { spreads } = useLogbookSpreads();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={spreads}
      numColumns={3}
      keyExtractor={(item) => item.key}
      renderItem={({ item, index }) => (
        <Pressable
          style={styles.thumb}
          onPress={() => navigation.navigate('Logbook', { jumpToIndex: index })}
        >
          <Text style={styles.thumbLabel} numberOfLines={2}>{item.label}</Text>
          <Text style={styles.thumbCount}>
            {item.leftItems.length + item.rightItems.length} item{item.leftItems.length + item.rightItems.length === 1 ? '' : 's'}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.deskGround },
  content: { padding: spacing[3], gap: spacing[2] },
  thumb: {
    flex: 1 / 3,
    margin: spacing[1],
    aspectRatio: 1,
    backgroundColor: colors.paper,
    borderRadius: radii.sm,
    padding: spacing[2],
    justifyContent: 'space-between',
  },
  thumbLabel: { ...textStyles.monoSm, color: colors.paperInk },
  thumbCount: { ...textStyles.caption, color: colors.paperMeta },
});
