import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AttributionFooter, ATTRIBUTION, type ProviderId } from '@/components/AttributionFooter';
import { colors, spacing, textStyles } from '@/theme/tokens';

const ALL_PROVIDERS = Object.keys(ATTRIBUTION) as ProviderId[];

/**
 * The full attribution registry, reachable on its own rather than only ever
 * appearing filtered-by-medium on a detail screen — several providers'
 * terms expect their credit to be discoverable independent of any one
 * piece of content, not just attached to it.
 */
export function AttributionScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Palette draws artwork and metadata from the services below. None of them receive your
        Palette identity — every lookup is proxied server-side.
      </Text>
      <View style={styles.footerWrap}>
        <AttributionFooter providers={ALL_PROVIDERS} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[5] },
  intro: { ...textStyles.bodySm, color: colors.textSecondary, marginBottom: spacing[4] },
  footerWrap: {},
});
