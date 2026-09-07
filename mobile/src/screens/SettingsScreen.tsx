import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';

/**
 * Delete-account flow, wired for real — this is an App Store ship-blocker
 * (ARCHITECTURE.md §6), not something to leave as a placeholder. Confirms by
 * requiring the user to type DELETE, then calls the delete-account edge
 * function, which runs with the service role and cascades everything.
 */
export function SettingsScreen() {
  const [confirmText, setConfirmText] = useState('');
  const signOut = useAuthStore((s) => s.signOut);

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
    <View style={styles.root}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas, padding: spacing[5], gap: spacing[4] },
  sectionTitle: { ...textStyles.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5 },
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
