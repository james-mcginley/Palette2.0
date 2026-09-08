import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNotifications, useMarkNotificationRead, type NotificationRow } from '@/lib/api/notifications';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Reads public.notifications — deliberately not a like/count feed (0004's
 * own comment): only things worth opening land here. `badge_earned` and
 * `path_node_unlocked` render with generic copy since Phase 4 (badges,
 * curator paths) hasn't shipped the screens they'd link to yet.
 */
function describeNotification(n: NotificationRow): string {
  switch (n.kind) {
    case 'ask_answered': return 'Someone answered your ask.';
    case 'new_follower': return 'You have a new follower.';
    case 'badge_earned': return 'You earned a badge.';
    case 'path_node_unlocked': return 'A new curator path step unlocked.';
    case 'report_resolved': return 'A report you filed was reviewed.';
    default: return 'New activity.';
  }
}

export function MailboxScreen() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePress = (n: NotificationRow) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.kind === 'ask_answered' && typeof n.payload.ask_id === 'string') {
      navigation.navigate('AskDetail', { askId: n.payload.ask_id });
    }
  };

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={notifications}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.spinner} />
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Nothing yet</Text>
            <Text style={styles.emptyNote}>Ask replies, new followers and unlocked steps show up here.</Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable style={[styles.row, !item.read_at && styles.rowUnread]} onPress={() => handlePress(item)}>
          {!item.read_at ? <View style={styles.dot} /> : null}
          <Text style={styles.rowText}>{describeNotification(item)}</Text>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[4], gap: spacing[2] },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  emptyTitle: { ...textStyles.headingMd, color: colors.textPrimary },
  emptyNote: { ...textStyles.bodySm, color: colors.textSecondary, marginTop: spacing[1], textAlign: 'center' },
  spinner: { marginTop: spacing[6] },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.surfaceBase, borderWidth: 1, borderColor: colors.borderDefault,
    borderRadius: radii.md, padding: spacing[4], minHeight: 44,
  },
  rowUnread: { borderColor: colors.accent },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  rowText: { ...textStyles.bodyMd, color: colors.textPrimary, flex: 1 },
  separator: { height: spacing[2] },
});
