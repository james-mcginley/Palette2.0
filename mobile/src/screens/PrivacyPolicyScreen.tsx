import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { colors, spacing, textStyles } from '@/theme/tokens';

/**
 * COMPLIANCE.md's pre-submission checklist: a live privacy policy URL is
 * required before App Store submission. Same situation as TermsScreen —
 * this is the real link and flow, not real legal text; what data Palette
 * actually collects and how it's handled needs to be documented by someone
 * who can speak to that authoritatively, not drafted here.
 */
export function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.warning}>
        Placeholder — not reviewed by counsel. Replace before shipping.
      </Text>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.body}>
        Palette stores what you create — profile details, logs, reviews, curations, follows, asks
        and answers — in order to run the app's core features. Third-party media lookups (film, TV,
        book, music and podcast search) are proxied server-side; providers never receive your
        Palette identity.
      </Text>
      <Text style={styles.body}>
        You can export a copy of your own data from Settings, and delete your account and
        everything tied to it at any time, also from Settings.
      </Text>
      <Text style={styles.body}>
        This is a placeholder pending real legal drafting and a live, hosted URL — App Store
        submission requires both before this screen can stand in for the real policy.
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
