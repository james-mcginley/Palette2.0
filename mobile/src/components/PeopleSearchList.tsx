import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSearchProfiles, useFollowingIds, useFollowUser, useUnfollowUser } from '@/lib/api/social';
import { UserRow } from '@/components/UserRow';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';

interface PeopleSearchListProps {
  ListFooterComponent?: React.ReactElement | null;
}

/** Search-and-follow list shared by FollowPeopleScreen (onboarding) and
 *  FindPeopleScreen (Friends tab) — the two places you go looking for
 *  people to follow are otherwise identical UI. */
export function PeopleSearchList({ ListFooterComponent }: PeopleSearchListProps) {
  const [query, setQuery] = useState('');
  const { data: profiles, isLoading } = useSearchProfiles(query);
  const { data: followingIds } = useFollowingIds();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  return (
    <View style={styles.root}>
      <TextInput
        style={styles.input}
        placeholder="Search by name or handle…"
        placeholderTextColor={colors.textDim}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      <FlatList
        contentContainerStyle={styles.list}
        data={profiles}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.spinner} />
          ) : (
            <Text style={styles.empty}>No one here yet.</Text>
          )
        }
        renderItem={({ item }) => {
          const isFollowing = followingIds?.has(item.id) ?? false;
          const isToggling =
            (followUser.isPending && followUser.variables === item.id) ||
            (unfollowUser.isPending && unfollowUser.variables === item.id);
          return (
            <UserRow
              profile={item}
              isFollowing={isFollowing}
              isToggling={isToggling}
              onToggleFollow={() => (isFollowing ? unfollowUser.mutate(item.id) : followUser.mutate(item.id))}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={ListFooterComponent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: spacing[3] },
  input: {
    backgroundColor: colors.surfaceBase,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.textPrimary,
    ...textStyles.bodyMd,
  },
  list: { flexGrow: 1, gap: spacing[2] },
  separator: { height: spacing[2] },
  spinner: { marginTop: spacing[6] },
  empty: { ...textStyles.bodySm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing[6] },
});
