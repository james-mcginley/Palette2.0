import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFriendActivityFeed } from '@/lib/api/feed';
import { useAuthStore } from '@/state/authStore';
import { colors, spacing, textStyles } from '@/theme/tokens';
import { MediaRow } from '@/components/MediaRow';
import { ReportBlockMenu } from '@/components/moderation/ReportBlockMenu';
import { DailyVibeAnchor } from '@/components/DailyVibeAnchor';
import { TastemakerShelf } from '@/components/TastemakerShelf';

/**
 * "Feed keeps a short run of friends' logs; the full stream is the Friends
 * tab" (Palette.dc.html:6910) — this is that short run: own logs plus
 * whatever your followees have logged, capped rather than paginated.
 *
 * The Vibe Anchor and tastemaker shelf are a `ListHeaderComponent`, not
 * gated behind the activity query's own loading/error/empty states — per
 * chat1.md:63 the Anchor is "there whether or not you already have
 * activity to look at."
 */
export function FeedScreen() {
  const { data: logs, isLoading, error } = useFriendActivityFeed(20);
  const currentUserId = useAuthStore((s) => s.session?.user.id);

  const header = (
    <>
      <DailyVibeAnchor />
      <TastemakerShelf />
    </>
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <View style={styles.content}>{header}</View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <View style={styles.content}>{header}</View>
        <View style={styles.center}>
          <Text style={styles.error}>Couldn't load your feed. Pull to retry once that's wired up.</Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={logs}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyNote}>Log something, or follow a few people from the Friends tab.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <MediaRow
          title={item.media_snapshot.title}
          mediaType={item.media_type}
          imageUrl={item.media_snapshot.imageUrl}
          creator={item.media_snapshot.creator}
          releaseYear={item.media_snapshot.releaseYear}
          rating={item.rating ?? undefined}
          metaText={[
            item.user_id !== currentUserId ? item.author?.display_name ?? item.author?.handle : null,
            item.review,
          ].filter(Boolean).join(' — ')}
          moreMenu={
            <ReportBlockMenu
              contentKind="log"
              contentId={item.id}
              authorId={item.user_id}
              authorName={item.author?.display_name ?? item.author?.handle ?? 'this member'}
            />
          }
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
  emptyNote: { ...textStyles.bodySm, color: colors.textSecondary, marginTop: spacing[1], textAlign: 'center' },
});
