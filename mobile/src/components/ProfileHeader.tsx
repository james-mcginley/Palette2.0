import React from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMyProfile } from '@/lib/api/profile';
import { useMyLogs } from '@/lib/api/logs';
import { useMyCurations } from '@/lib/api/curations';
import { useFollowCounts } from '@/lib/api/social';
import { useAuthStore } from '@/state/authStore';
import { Icon } from '@/components/Icon';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';

interface ProfileHeaderProps {
  /** Tapping the card body (outside the gear) opens the fuller profile
   *  (monthly mosaic, badges, collections) — the header itself only carries
   *  identity + stats, per Palette.dc.html:1442-1467. */
  onPress?: () => void;
  onPressSettings?: () => void;
}

/**
 * "The Library tab is also the user's own profile — their header sits
 * above their shelves rather than on a separate screen" (Palette.dc.html
 * :8303-8304). Ported from the isMyStuff card at Palette.dc.html:1444-1467:
 * gradient card, circular avatar, name, bio, location, a settings gear, and
 * a 4-stat row underneath.
 */
export function ProfileHeader({ onPress, onPressSettings }: ProfileHeaderProps) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: profile } = useMyProfile();
  const { data: logs } = useMyLogs();
  const { data: curations } = useMyCurations();
  const { data: counts } = useFollowCounts(userId);

  const stats = [
    { label: 'Logged', value: logs?.length ?? 0 },
    { label: 'Lists', value: curations?.length ?? 0 },
    { label: 'Followers', value: counts?.followers ?? 0 },
    { label: 'Following', value: counts?.following ?? 0 },
  ];

  return (
    <LinearGradient
      colors={['rgba(29,138,98,0.14)', colors.surfaceRaised, colors.surfaceCanvas]}
      locations={[0, 0.55, 1]}
      style={styles.card}
    >
      <Pressable style={styles.topRow} onPress={onPress} disabled={!onPress} accessibilityRole="button">
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>
              {(profile?.display_name ?? profile?.handle ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>{profile?.display_name ?? profile?.handle ?? 'You'}</Text>
          {profile?.bio ? <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text> : null}
          {profile?.city ? <Text style={styles.location}>{profile.city.toUpperCase()}</Text> : null}
        </View>
      </Pressable>

      <Pressable
        style={styles.settingsButton}
        onPress={onPressSettings}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={8}
      >
        <Icon name="gear" color={colors.textPrimary} size={17} />
      </Pressable>

      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 18,
    padding: spacing[4],
    gap: spacing[3],
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], paddingRight: 44 },
  avatar: { width: 64, height: 64, borderRadius: radii.full, borderWidth: 2, borderColor: colors.borderDefault },
  avatarFallback: {
    width: 64, height: 64, borderRadius: radii.full, borderWidth: 2, borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { ...textStyles.headingLg, color: colors.textPrimary },
  identity: { flex: 1, minWidth: 0, paddingTop: 2, gap: 3 },
  name: { ...textStyles.headingMd, color: colors.textPrimary },
  bio: { ...textStyles.bodySm, color: colors.textSecondary },
  location: { ...textStyles.monoSm, color: colors.textDim, letterSpacing: 1 },
  settingsButton: {
    position: 'absolute', top: spacing[4], right: spacing[4],
    width: 36, height: 36, borderRadius: radii.full,
    backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: spacing[2], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.borderSoft },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...textStyles.monoMd, fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  statLabel: { ...textStyles.monoSm, fontSize: 7.5, color: colors.textSecondary, letterSpacing: 1, marginTop: 3 },
});
