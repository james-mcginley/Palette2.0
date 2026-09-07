import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLibraryItems, useUpdateItemStatus, STATUS_LABEL, nextStatus, type ItemStatus } from '@/lib/api/library';
import { MediaRow } from '@/components/MediaRow';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import { MEDIA_LABEL, type MediaType } from '@/lib/types/media';
import type { RootStackParamList } from '@/navigation/types';

const STATUS_FILTERS: Array<{ key: ItemStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'want', label: 'Want' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'consumed', label: 'Consumed' },
];

/** Brief: "Filter Pills: All | Books | Cinema | Music | Podcasts | Gigs". */
const MEDIA_FILTERS: Array<{ key: MediaType | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'BOOK', label: 'Books' },
  { key: 'FILM', label: 'Cinema' },
  { key: 'VINYL', label: 'Music' },
  { key: 'CAST', label: 'Podcasts' },
  { key: 'EVENT', label: 'Gigs' },
];

/**
 * "My List" / the personal trove. Status lives on each list_item, not on
 * which of the three smart lists (or a custom curation) it happens to sit
 * in — see lib/api/library.ts — so filtering is just a client-side reduce
 * over one flat query, per ARCHITECTURE.md's offline-first requirement:
 * this is 'library'-prefixed and persisted, so it renders fully from cache
 * with zero network on a cold, offline launch.
 */
export function LibraryScreen() {
  const { data: items, isLoading, error } = useLibraryItems();
  const updateStatus = useUpdateItemStatus();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [mediaFilter, setMediaFilter] = useState<MediaType | 'all'>('all');

  const filtered = useMemo(() => {
    return (items ?? []).filter(
      (item) =>
        (statusFilter === 'all' || item.status === statusFilter) &&
        (mediaFilter === 'all' || item.media_type === mediaFilter)
    );
  }, [items, statusFilter, mediaFilter]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Couldn't load your library.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {STATUS_FILTERS.map((f) => (
          <Pill key={f.key} label={f.label} active={statusFilter === f.key} onPress={() => setStatusFilter(f.key)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {MEDIA_FILTERS.map((f) => (
          <Pill key={f.key} label={f.label} active={mediaFilter === f.key} onPress={() => setMediaFilter(f.key)} />
        ))}
      </ScrollView>

      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyNote}>Log or save something from Discover to start your trove.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MediaRow
            title={item.media_snapshot.title}
            mediaType={item.media_type}
            creator={item.media_snapshot.creator}
            releaseYear={item.media_snapshot.releaseYear}
            onPress={() =>
              navigation.navigate('MediaDetail', { mediaId: item.media_id, media: item.media_snapshot })
            }
            trailingLabel={STATUS_LABEL[item.status]}
            trailingActive={item.status === 'consumed'}
            onPressTrailing={() =>
              updateStatus.mutate({ itemId: item.id, status: nextStatus(item.status) })
            }
          />
        )}
      />
    </View>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  error: { ...textStyles.bodySm, color: colors.danger, textAlign: 'center' },
  emptyTitle: { ...textStyles.headingMd, color: colors.textPrimary },
  emptyNote: { ...textStyles.bodySm, color: colors.textSecondary, marginTop: spacing[1], textAlign: 'center' },
  pillRow: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[2] },
  pill: {
    minHeight: 36,
    paddingHorizontal: spacing[4],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pillLabel: { ...textStyles.caption, color: colors.textSecondary },
  pillLabelActive: { color: colors.accent },
  list: { padding: spacing[4], gap: spacing[2] },
});
