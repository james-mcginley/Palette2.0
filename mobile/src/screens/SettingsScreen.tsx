import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';
import { useMyBlockedProfiles, useUnblockUser } from '@/lib/api/moderation';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Delete-account flow, wired for real — this is an App Store ship-blocker
 * (ARCHITECTURE.md §6), not something to leave as a placeholder. Confirms by
 * requiring the user to type DELETE, then calls the delete-account edge
 * function, which runs with the service role and cascades everything.
 */
export function SettingsScreen() {
  const [confirmText, setConfirmText] = useState('');
  const signOut = useAuthStore((s) => s.signOut);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: blockedProfiles, isLoading: isLoadingBlocked } = useMyBlockedProfiles();
  const unblockUser = useUnblockUser();

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('No active session.');

      const { error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;

      await signOut();
    } catch (err: any) {
      Alert.alert('Couldn’t delete account', err.message ?? 'Try again in a moment.');
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Privacy</Text>

      <Pressable style={styles.row} onPress={() => navigation.navigate('Terms')}>
        <Text style={styles.rowLabel}>Terms of Use</Text>
        <Text style={styles.rowChevron}>›</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Blocked accounts</Text>
        {isLoadingBlocked ? (
          <ActivityIndicator color={colors.accent} />
        ) : blockedProfiles && blockedProfiles.length > 0 ? (
          blockedProfiles.map((b) => (
            <View key={b.blocked_id} style={styles.blockedRow}>
              <Text style={styles.blockedName} numberOfLines={1}>
                {b.profile?.display_name ?? b.profile?.handle ?? 'Palette member'}
              </Text>
              <Pressable
                style={styles.unblockButton}
                onPress={() => unblockUser.mutate(b.blocked_id)}
                disabled={unblockUser.isPending && unblockUser.variables === b.blocked_id}
              >
                <Text style={styles.unblockLabel}>Unblock</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.cardBody}>You haven't blocked anyone.</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Account</Text>

      <View style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Delete account</Text>
        <Text style={styles.dangerBody}>
          This removes your account, your logs, your lists and your reviews. It cannot be undone.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Type DELETE to confirm"
          placeholderTextColor={colors.textDim}
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
        />
        <Pressable
          style={[styles.deleteButton, confirmText !== 'DELETE' && styles.disabled]}
          disabled={confirmText !== 'DELETE'}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteLabel}>Delete my account</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[5], gap: spacing[3] },
  sectionTitle: { ...textStyles.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: spacing[2] },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 44, backgroundColor: colors.surfaceBase, borderWidth: 1, borderColor: colors.borderDefault,
    borderRadius: radii.md, paddingHorizontal: spacing[4],
  },
  rowLabel: { ...textStyles.bodyMd, color: colors.textPrimary },
  rowChevron: { ...textStyles.headingMd, color: colors.textDim },
  card: {
    backgroundColor: colors.surfaceBase, borderWidth: 1, borderColor: colors.borderDefault,
    borderRadius: radii.md, padding: spacing[4], gap: spacing[3],
  },
  cardTitle: { ...textStyles.bodyStrong, color: colors.textPrimary },
  cardBody: { ...textStyles.bodySm, color: colors.textSecondary },
  blockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  blockedName: { ...textStyles.bodySm, color: colors.textPrimary, flex: 1 },
  unblockButton: {
    minHeight: 36, paddingHorizontal: spacing[3], borderRadius: radii.full,
    borderWidth: 1, borderColor: colors.borderDefault, alignItems: 'center', justifyContent: 'center',
  },
  unblockLabel: { ...textStyles.caption, color: colors.textSecondary },
  dangerCard: {
    backgroundColor: colors.surfaceBase,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    padding: spacing[4],
    gap: spacing[3],
  },
  dangerTitle: { ...textStyles.headingMd, color: colors.textPrimary },
  dangerBody: { ...textStyles.bodySm, color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.sm,
    padding: spacing[3],
    color: colors.textPrimary,
    ...textStyles.bodyMd,
  },
  deleteButton: {
    backgroundColor: colors.danger,
    borderRadius: radii.full,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  deleteLabel: { ...textStyles.bodyStrong, color: colors.textPrimary },
  disabled: { opacity: 0.4 },
});
