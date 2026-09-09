import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

/**
 * chat1.md:63 — "Daily Vibe Anchor: Featured top card prompting 'What
 * shaped your day today?' with a quick-log trigger." A persistent header on
 * Feed, not an empty-state message: it's there whether or not you already
 * have activity to look at.
 */
export function DailyVibeAnchor() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      style={styles.root}
      onPress={() => navigation.navigate('QuickCapture')}
      accessibilityRole="button"
      accessibilityLabel="What shaped your day today? Log something."
    >
      <LinearGradient
        colors={[colors.accentSoft, colors.surfaceRaised]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Today</Text>
        <Text style={styles.prompt}>What shaped your day today?</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaLabel}>Log it</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    marginBottom: spacing[3],
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  content: { padding: spacing[4], gap: 4 },
  eyebrow: { ...textStyles.monoSm, color: colors.amber, textTransform: 'uppercase', letterSpacing: 1.5 },
  prompt: { ...textStyles.headingLg, color: colors.textPrimary },
  cta: {
    marginTop: spacing[2],
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: spacing[4],
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { ...textStyles.caption, color: colors.textOnAccent, fontWeight: '700' },
});
