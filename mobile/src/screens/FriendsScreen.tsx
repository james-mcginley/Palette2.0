import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFriendActivityStream } from '@/lib/api/feed';
import { useAuthStore } from '@/state/authStore';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import { MediaRow } from '@/components/MediaRow';
import { ReportBlockMenu } from '@/components/moderation/ReportBlockMenu';
import type { RootStackParamList } from '@/navigation/types';

/** The full friend-activity stream — Feed shows a capped recent slice of
 *  the same underlying query (see feed.ts). */
export function FriendsScreen() {
  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } = useFriendActivityStream();
  const currentUserId = useAuthStore((s) => s.session?.user.id);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const logs = data?.pages.flat() ?? [];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <Pressable
          style={styles.findButton}
          onPress={() => navigation.navigate('FindPeople')}
          accessibilityRole="button"
          accessibilityLabel="Find people to follow"
        >
          <Text style={styles.findLabel}>Find people</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>Couldn't load Friends. Pull to try again.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={logs}
          keyExtractor={(item) => item.id}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator color={colors.accent} style={styles.spinner} />
            ) : (
              <View style={styles.center}>
                <Text style={styles.emptyTitle}>No activity yet</Text>
                <Text style={styles.emptyNote}>Follow a few people to see what they're logging.</Text>
              </View>
            )
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
                item.user_id !== currentUserId ? item.author?.display_name ?? item.author?.handle : 'You',
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
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing[4], paddingTop: spacing[6],
  },
  title: { ...textStyles.headingLg, color: colors.textPrimary },
  findButton: {
    borderRadius: radii.full, borderWidth: 1, borderColor: colors.borderDefault,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
  },
  findLabel: { ...textStyles.caption, color: colors.accent },
  list: { padding: spacing[4], paddingTop: 0, gap: spacing[3] },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  error: { ...textStyles.bodySm, color: colors.danger, textAlign: 'center' },
  emptyTitle: { ...textStyles.headingMd, color: colors.textPrimary },
  emptyNote: { ...textStyles.bodySm, color: colors.textSecondary, marginTop: spacing[1], textAlign: 'center' },
  spinner: { marginTop: spacing[6] },
});
