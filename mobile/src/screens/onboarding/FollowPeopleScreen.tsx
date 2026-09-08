import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFollowingIds } from '@/lib/api/social';
import { useCompleteOnboarding } from '@/lib/api/profile';
import { PeopleSearchList } from '@/components/PeopleSearchList';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';

/** Onboarding step 5 of 5. Completing it — not just visiting it — is what
 *  flips `onboarding_completed_at` and lets RootNavigator swap into Main;
 *  see that file's comment for why this has to be server state. */
export function FollowPeopleScreen() {
  const { data: followingIds } = useFollowingIds();
  const completeOnboarding = useCompleteOnboarding();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Follow some people</Text>
        <Text style={styles.note}>Their logs and collections will show up in your Feed.</Text>
      </View>

      <PeopleSearchList />

      <Pressable
        style={styles.doneButton}
        onPress={() => completeOnboarding.mutate()}
        disabled={completeOnboarding.isPending}
        accessibilityRole="button"
      >
        {completeOnboarding.isPending ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <Text style={styles.doneLabel}>
            {followingIds && followingIds.size > 0 ? 'Done' : 'Skip for now'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas, padding: spacing[5], paddingTop: spacing[8], gap: spacing[3] },
  header: { gap: spacing[2] },
  title: { ...textStyles.headingLg, color: colors.textPrimary },
  note: { ...textStyles.bodySm, color: colors.textSecondary },
  doneButton: {
    height: 50,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  doneLabel: { ...textStyles.bodyStrong, color: colors.textOnAccent },
});
