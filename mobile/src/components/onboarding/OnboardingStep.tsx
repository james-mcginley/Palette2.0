import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';

interface OnboardingStepProps {
  title: string;
  note: string;
  continueLabel?: string;
  onContinue: () => void;
}

/**
 * Shared shell for the three onboarding steps (import lists, loved titles,
 * genres) that PLAN.md flags as needing a product decision before they're
 * worth building out fully ("decide whether this is a real importer or a
 * soft skip", etc.) — until that decision is made, each is a real,
 * navigable step rather than a dead-end placeholder, so the onboarding flow
 * as a whole is completable today.
 */
export function OnboardingStep({ title, note, continueLabel = 'Continue', onContinue }: OnboardingStepProps) {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.note}>{note}</Text>
      </View>
      <Pressable style={styles.button} onPress={onContinue} accessibilityRole="button">
        <Text style={styles.buttonLabel}>{continueLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas, padding: spacing[5], paddingTop: spacing[9], justifyContent: 'space-between' },
  content: { gap: spacing[3] },
  title: { ...textStyles.headingLg, color: colors.textPrimary },
  note: { ...textStyles.bodySm, color: colors.textSecondary },
  button: {
    height: 50,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  buttonLabel: { ...textStyles.bodyStrong, color: colors.textOnAccent },
});
