import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '@/navigation/types';
import { AttributionFooter } from '@/components/AttributionFooter';
import { colors, spacing, textStyles } from '@/theme/tokens';
import { MEDIA_LABEL } from '@/lib/types/media';
import { useMediaDetail } from '@/lib/api/mediaSearch';

type Props = NativeStackScreenProps<RootStackParamList, 'MediaDetail'>;

/**
 * The media sheet from the brief — cover, synopsis, rating, log/save
 * actions. `route.params.media` (a search result or an existing log) is
 * passed as `initialData` so those paths render instantly with no network
 * round-trip; a screen opened from just an id (a badge, a curator-path node,
 * a bare library reference) falls through to the media-detail edge function.
 */
export function MediaDetailScreen({ route }: Props) {
  const { mediaId, media: snapshot } = route.params;
  const { data: media, isLoading, isError } = useMediaDetail(mediaId, snapshot);

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
      ) : isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      ) : (
        <Text style={styles.synopsis}>
          {isError ? "Couldn't load this — check your connection and try again." : 'Not found.'}
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
  spinner: { marginTop: spacing[6] },
});
