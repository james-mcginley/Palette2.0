import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, textStyles } from '@/theme/tokens';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

/**
 * EDITORIAL_SYSTEM.md §1: "A 1px amber rule above the header, 32px wide, not
 * full width. Small detail, does most of the magazine work." No serif here
 * per the resolved green/black/Roboto direction (tokens.ts) — bold Roboto
 * stands in for `editorial-lg`.
 */
export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.root}>
      <View style={styles.rule} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6, marginBottom: spacing[3] },
  rule: { width: 32, height: 1, backgroundColor: colors.amber },
  title: { ...textStyles.headingLg, color: colors.textPrimary },
  subtitle: { ...textStyles.caption, color: colors.textSecondary },
});
