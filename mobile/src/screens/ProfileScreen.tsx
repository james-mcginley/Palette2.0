import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useMyProfile } from '@/lib/api/profile';
import { useMyLogs } from '@/lib/api/logs';
import { useMyBadges } from '@/lib/api/badges';
import { useMyCurations } from '@/lib/api/curations';
import { MonthlyMosaic, type MosaicItem } from '@/components/logging/MonthlyMosaic';
import { Cover } from '@/components/Cover';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

/**
 * Own profile only for now — `route.params.userId` (viewing someone else's
 * profile) needs a public-read equivalent of every query below plus its own
 * empty/private-account states, which is real scope beyond what this pass
 * covers; every query here is `useMy*`, deliberately.
 */
export function ProfileScreen({ route, navigation }: Props) {
  const { data: profile } = useMyProfile();
  const { data: logs } = useMyLogs();
  const { data: badges } = useMyBadges();
  const { data: curations } = useMyCurations();
  const [mosaicGenerating, setMosaicGenerating] = useState(true);

  const thisMonthItems: MosaicItem[] = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return (logs ?? [])
      .filter((l) => l.logged_on.startsWith(monthKey))
      .map((l) => ({
        id: l.id,
        render: () => <Cover imageUrl={l.media_snapshot.imageUrl} title={l.media_snapshot.title} style={styles.mosaicCover} borderRadius={radii.sm} />,
      }));
  }, [logs]);

  if (route.params?.userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyNote}>Viewing other people's profiles isn't built yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.name}>{profile?.display_name ?? 'You'}</Text>
          {profile?.handle ? <Text style={styles.handle}>@{profile.handle}</Text> : null}
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </View>
        <Pressable
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Text style={styles.settingsLabel}>Settings</Text>
        </Pressable>
      </View>

      {(logs?.length ?? 0) >= 10 ? (
        // EDITORIAL_SYSTEM.md §2: "Unlocks at 10 logged items. Before that
        // the toggle is hidden, not disabled — a greyed control invites a
        // question you have to answer." Hidden, not a disabled row, below
        // that count.
        <Pressable style={styles.logbookRow} onPress={() => navigation.navigate('Logbook')}>
          <Text style={styles.logbookLabel}>Open your Logbook</Text>
          <Text style={styles.logbookChevron}>›</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>This month</Text>
      {thisMonthItems.length > 0 ? (
        <MonthlyMosaic
          items={thisMonthItems}
          generating={mosaicGenerating}
          onGenerated={() => setMosaicGenerating(false)}
        />
      ) : (
        <Text style={styles.emptyNote}>Nothing logged this month yet.</Text>
      )}

      {badges && badges.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Badges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
            {badges.map((b) => (
              <View key={b.id} style={styles.badge}>
                <Text style={styles.badgeName} numberOfLines={2}>{b.name}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={styles.collectionsHeader}>
        <Text style={styles.sectionTitle}>Your collections</Text>
        <Pressable onPress={() => navigation.navigate('CurationBuilder')}>
          <Text style={styles.newLabel}>+ New</Text>
        </Pressable>
      </View>
      {curations && curations.length > 0 ? (
        curations.map((c) => (
          <Pressable
            key={c.id}
            style={styles.curationRow}
            onPress={() => navigation.navigate('CurationBuilder', { curationId: c.id })}
          >
            <Text style={styles.curationTitle} numberOfLines={1}>{c.title}</Text>
            <Text style={styles.curationMeta}>{c.itemCount} items · {c.visibility}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.emptyNote}>You haven't built a collection yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[5], gap: spacing[2], paddingBottom: spacing[8] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceCanvas, padding: spacing[6] },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerText: { flex: 1, gap: 4 },
  name: { ...textStyles.displayMd, color: colors.textPrimary },
  handle: { ...textStyles.caption, color: colors.textSecondary },
  bio: { ...textStyles.bodyMd, color: colors.textSecondary, marginTop: spacing[1] },
  settingsButton: { minHeight: 36, paddingHorizontal: spacing[3], borderRadius: radii.full, borderWidth: 1, borderColor: colors.borderDefault, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { ...textStyles.caption, color: colors.textSecondary },
  sectionTitle: { ...textStyles.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: spacing[5] },
  logbookRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 44, backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: colors.amberDim,
    borderRadius: radii.md, paddingHorizontal: spacing[4], marginTop: spacing[5],
  },
  logbookLabel: { ...textStyles.bodyStrong, color: colors.amber },
  logbookChevron: { ...textStyles.headingMd, color: colors.amber },
  mosaicCover: { width: '100%', aspectRatio: 1 },
  emptyNote: { ...textStyles.bodySm, color: colors.textSecondary, marginTop: spacing[2] },
  badgeRow: { gap: spacing[2], marginTop: spacing[2] },
  badge: {
    width: 96, minHeight: 64, backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: colors.amberDim,
    borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', padding: spacing[2],
  },
  badgeName: { ...textStyles.caption, color: colors.amber, textAlign: 'center' },
  collectionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[5] },
  newLabel: { ...textStyles.bodyStrong, color: colors.accent },
  curationRow: {
    backgroundColor: colors.surfaceBase, borderWidth: 1, borderColor: colors.borderDefault,
    borderRadius: radii.md, padding: spacing[3], marginTop: spacing[2], gap: 2,
  },
  curationTitle: { ...textStyles.bodyStrong, color: colors.textPrimary },
  curationMeta: { ...textStyles.caption, color: colors.textSecondary },
});
