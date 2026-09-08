import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useCurationDetail } from '@/lib/api/discover';
import { MediaRow } from '@/components/MediaRow';
import { ReportBlockMenu } from '@/components/moderation/ReportBlockMenu';
import { colors, spacing, textStyles } from '@/theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'CurationDetail'>;

/**
 * The destination for tapping a Collection or Ranked tile's background
 * (EDITORIAL_SYSTEM.md §1: "Tapping the tile background opens the
 * collection" — an individual cover inside the tile opens that item's own
 * detail sheet instead, handled directly on the tile).
 */
export function CurationDetailScreen({ route }: Props) {
  const { curationId, title } = route.params;
  const { data, isLoading, isError } = useCurationDetail(curationId);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={data?.items ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{data?.title ?? title ?? 'Collection'}</Text>
            {data ? (
              <ReportBlockMenu
                contentKind="curation"
                contentId={data.id}
                authorId={data.user_id}
                authorName={data.authorName}
              />
            ) : null}
          </View>
          {data?.description ? <Text style={styles.description}>{data.description}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.spinner} />
        ) : isError ? (
          <Text style={styles.empty}>Couldn't load this collection.</Text>
        ) : (
          <Text style={styles.empty}>No items in this collection yet.</Text>
        )
      }
      renderItem={({ item, index }) => (
        <MediaRow
          title={item.media_snapshot.title}
          mediaType={item.media_type}
          creator={item.media_snapshot.creator}
          releaseYear={item.media_snapshot.releaseYear}
          metaText={[String(index + 1), item.media_snapshot.creator].filter(Boolean).join('. ')}
          onPress={() =>
            navigation.navigate('MediaDetail', { mediaId: item.media_id, media: item.media_snapshot })
          }
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  header: { gap: spacing[2], marginBottom: spacing[4] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[2] },
  title: { ...textStyles.displayMd, color: colors.textPrimary, flex: 1 },
  description: { ...textStyles.bodyMd, color: colors.textSecondary },
  separator: { height: spacing[2] },
  spinner: { marginTop: spacing[6] },
  empty: { ...textStyles.bodySm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing[6] },
});
