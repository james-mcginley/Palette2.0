import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '@/navigation/types';
import { AttributionFooter } from '@/components/AttributionFooter';
import { colors, spacing, textStyles } from '@/theme/tokens';
import { MEDIA_LABEL } from '@/lib/types/media';

type Props = NativeStackScreenProps<RootStackParamList, 'MediaDetail'>;

/**
 * The media sheet from the brief — cover, synopsis, rating, log/save
 * actions. This pass only renders what's already in the route param (no
 * detail-fetch query yet — Phase 2) but wires in AttributionFooter for real,
 * since skipping it is an App Store/legal risk, not a cosmetic gap.
 */
export function MediaDetailScreen({ route }: Props) {
  const { media } = route.params;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {media ? (
        <>
          <Text style={styles.tag}>{MEDIA_LABEL[media.mediaType]}</Text>
          <Text style={styles.title}>{media.title}</Text>
          {media.creator ? <Text style={styles.creator}>{media.creator}</Text> : null}
          {media.synopsis ? <Text style={styles.synopsis}>{media.synopsis}</Text> : null}

          <View style={styles.footerWrap}>
            <AttributionFooter medium={media.mediaType} />
          </View>
        </>
      ) : (
        <Text style={styles.synopsis}>
          No media snapshot passed — this screen needs a media-by-id query once one exists server-side.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[5], gap: spacing[2] },
  tag: { ...textStyles.monoSm, color: colors.amber, textTransform: 'uppercase', letterSpacing: 1.5 },
  title: { ...textStyles.displayMd, color: colors.textPrimary },
  creator: { ...textStyles.bodyMd, color: colors.textSecondary },
  synopsis: { ...textStyles.bodyMd, color: colors.textSecondary, marginTop: spacing[3] },
  footerWrap: { marginTop: spacing[6] },
});
