import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import type { ProfileSummary } from '@/lib/api/social';

interface UserRowProps {
  profile: ProfileSummary;
  isFollowing: boolean;
  onToggleFollow: () => void;
  isToggling?: boolean;
  onPress?: () => void;
}

const AVATAR_SIZE = 40;

function initialsFor(profile: ProfileSummary): string {
  const source = profile.display_name || profile.handle || '?';
  return source.trim().slice(0, 1).toUpperCase();
}

/** Shared row for FollowPeopleScreen and FriendsScreen's search — avatar (or
 *  initial, since not every profile has one), name/handle, follow toggle. */
export function UserRow({ profile, isFollowing, onToggleFollow, isToggling, onPress }: UserRowProps) {
  const name = profile.display_name || profile.handle || 'Palette member';

  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      {profile.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>{initialsFor(profile)}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {profile.handle ? <Text style={styles.handle} numberOfLines={1}>@{profile.handle}</Text> : null}
      </View>

      <Pressable
        style={[styles.followButton, isFollowing && styles.followingButton]}
        onPress={onToggleFollow}
        disabled={isToggling}
        accessibilityRole="button"
        accessibilityLabel={isFollowing ? `Unfollow ${name}` : `Follow ${name}`}
        hitSlop={8}
      >
        {isToggling ? (
          <ActivityIndicator size="small" color={isFollowing ? colors.textSecondary : colors.textOnAccent} />
        ) : (
          <Text style={[styles.followLabel, isFollowing && styles.followingLabel]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surfaceBase,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.md,
    padding: spacing[3],
    minHeight: 44,
  },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: colors.surfaceRaised },
  avatarFallback: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.amberDim, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { ...textStyles.bodyStrong, color: colors.textOnAmber },
  info: { flex: 1, gap: 2 },
  name: { ...textStyles.bodyStrong, color: colors.textPrimary },
  handle: { ...textStyles.caption, color: colors.textSecondary },
  followButton: {
    minHeight: 36, minWidth: 92, paddingHorizontal: spacing[3],
    borderRadius: radii.full, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  followingButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderDefault },
  followLabel: { ...textStyles.caption, color: colors.textOnAccent, fontWeight: '700' },
  followingLabel: { color: colors.textSecondary },
});
