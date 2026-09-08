import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { colors, spacing, textStyles } from '@/theme/tokens';

/**
 * COMPLIANCE.md §1: Apple's guideline 1.2 checklist rejects an app with
 * public UGC for lacking a Terms of Use / EULA that states zero tolerance
 * for objectionable content — not optional, and not something to fabricate
 * here. This screen exists so the link and the navigation flow are real
 * before launch; the text below is a placeholder marking what still needs
 * actual legal drafting, not terms to ship as-is.
 */
export function TermsScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.warning}>
        Placeholder — not reviewed by counsel. Replace before shipping.
      </Text>
      <Text style={styles.title}>Terms of Use</Text>
      <Text style={styles.body}>
        Palette has zero tolerance for objectionable content or abusive users. Content that
        violates these terms may be removed, and accounts that post it may be suspended or
        terminated, at Palette's discretion.
      </Text>
      <Text style={styles.body}>
        Report anything that violates these terms from the ⋯ menu on that content. Reports are
        reviewed within 24 hours. You can block another user at any time from the same menu, or
        manage existing blocks from Settings → Privacy.
      </Text>
      <Text style={styles.body}>
        This is a placeholder pending real legal drafting — it establishes the required app-review
        flow (a linked EULA stating zero tolerance for objectionable content) but is not itself
        the final terms.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[5], gap: spacing[3] },
  warning: { ...textStyles.caption, color: colors.danger },
  title: { ...textStyles.displayMd, color: colors.textPrimary },
  body: { ...textStyles.bodyMd, color: colors.textSecondary },
});
