import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useMyLogs } from '@/lib/api/logs';
import { colors, spacing, textStyles } from '@/theme/tokens';
import { MediaRow } from '@/components/MediaRow';

/**
 * The one screen in this pass wired to a real, live query rather than a
 * placeholder, to prove the data layer end to end: auth → RLS → React Query
 * → render. It renders the signed-in user's own logs (not yet the
 * friends/tastemakers feed the brief describes, which needs the follow
 * graph joined in — see PLAN.md Phase 3).
 */
export function FeedScreen() {
  const { data: logs, isLoading, error } = useMyLogs();

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
        <Text style={styles.error}>Couldn't load your feed. Pull to retry once that's wired up.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={logs}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nothing logged yet</Text>
          <Text style={styles.emptyNote}>What shaped your day today?</Text>
        </View>
      }
      renderItem={({ item }) => (
        <MediaRow
          title={item.media_snapshot.title}
          mediaType={item.media_type}
          creator={item.media_snapshot.creator}
          releaseYear={item.media_snapshot.releaseYear}
          rating={item.rating ?? undefined}
          metaText={item.review ?? undefined}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[4], gap: spacing[3] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  error: { ...textStyles.bodySm, color: colors.danger, textAlign: 'center' },
  emptyTitle: { ...textStyles.headingMd, color: colors.textPrimary },
  emptyNote: { ...textStyles.bodySm, color: colors.textSecondary, marginTop: spacing[1] },
});
