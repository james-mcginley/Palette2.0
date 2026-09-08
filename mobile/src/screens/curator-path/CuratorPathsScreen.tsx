import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePublishedCuratorPaths } from '@/lib/api/curatorPaths';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

/** Browse list for published curator paths — reached from Discover, the
 *  same way Asks is, mirroring the design's own Discover-filter chips
 *  ('Shelves', 'People', 'Paths', 'Asks') without building all four. */
export function CuratorPathsScreen() {
  const { data: paths, isLoading } = usePublishedCuratorPaths();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={paths}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.spinner} />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No paths published yet</Text>
            <Text style={styles.emptyNote}>Curator paths are editorial content, added via the Supabase SQL editor.</Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => navigation.navigate('CuratorPath', { pathId: item.id })}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.curator}>By {item.curator_name}</Text>
          {item.description ? <Text style={styles.description} numberOfLines={2}>{item.description}</Text> : null}
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[4] },
  spinner: { marginTop: spacing[6] },
  empty: { alignItems: 'center', padding: spacing[6], gap: spacing[1] },
  emptyTitle: { ...textStyles.headingMd, color: colors.textPrimary },
  emptyNote: { ...textStyles.bodySm, color: colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: colors.surfaceBase, borderWidth: 1, borderColor: colors.borderDefault,
    borderRadius: radii.md, padding: spacing[4], gap: 4,
  },
  title: { ...textStyles.headingMd, color: colors.textPrimary },
  curator: { ...textStyles.caption, color: colors.amber, textTransform: 'uppercase', letterSpacing: 1.2 },
  description: { ...textStyles.bodySm, color: colors.textSecondary },
  separator: { height: spacing[2] },
});
