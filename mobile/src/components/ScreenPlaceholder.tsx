import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, textStyles } from '@/theme/tokens';

interface Props {
  title: string;
  note: string;
}

/**
 * Stand-in for every screen not yet built out pixel-for-pixel. This pass is
 * the navigation shell + data layer (PLAN.md Phase 0) — screens are filled
 * in against Palette.dc.html in the phases that follow, library/log first.
 */
export function ScreenPlaceholder({ title, note }: Props) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>{note}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[5], paddingTop: spacing[8], gap: spacing[3] },
  title: { ...textStyles.headingLg, color: colors.textPrimary },
  note: { ...textStyles.bodySm, color: colors.textSecondary },
});
