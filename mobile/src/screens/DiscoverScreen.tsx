import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMediaSearch } from '@/lib/api/mediaSearch';
import { useDiscoverFeed } from '@/lib/api/discover';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import { MediaRow } from '@/components/MediaRow';
import { SectionHeader } from '@/components/discover/SectionHeader';
import { DiscoverGrid } from '@/components/discover/DiscoverGrid';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Search-as-you-type (media-search) is only half of Discover — with an
 * empty query it shows the editorial grid instead (EDITORIAL_SYSTEM.md §1),
 * built from real public curations rather than search results.
 */
export function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const {
    items,
    failedProviders,
    isLoading,
    isQueryLongEnough,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMediaSearch(query);
  const feed = useDiscoverFeed();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.root}>
      <TextInput
        style={styles.input}
        placeholder="Search books, film, TV, music, podcasts…"
        placeholderTextColor={colors.textDim}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      {isQueryLongEnough && failedProviders.length > 0 && (
        <Text style={styles.warning}>
          {failedProviders.join(', ')} unavailable right now — showing what did load.
        </Text>
      )}

      {isQueryLongEnough ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={items}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No results.</Text> : null}
          renderItem={({ item }) => (
            <MediaRow
              title={item.title}
              mediaType={item.mediaType}
              creator={item.creator}
              releaseYear={item.releaseYear}
              rating={item.rating}
              onPress={() => navigation.navigate('MediaDetail', { mediaId: item.id, media: item })}
              trailingLabel="Log"
              onPressTrailing={() => navigation.navigate('LogSheet', { media: item })}
            />
          )}
          ListFooterComponent={
            hasNextPage ? (
              <Pressable
                style={styles.showMore}
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                accessibilityRole="button"
                accessibilityLabel="Show more results"
              >
                {isFetchingNextPage ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Text style={styles.showMoreLabel}>Show more results</Text>
                )}
              </Pressable>
            ) : null
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.feedContent}>
          <SectionHeader
            title="Community collections"
            subtitle="Cross-media picks, built by Palette members"
          />
          {feed.isLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.spinner} />
          ) : feed.isError ? (
            <Text style={styles.empty}>Couldn't load Discover — pull to try again.</Text>
          ) : feed.data && feed.data.length > 0 ? (
            <DiscoverGrid tiles={feed.data} />
          ) : (
            <Text style={styles.empty}>
              No collections yet — be the first to build one from your Library.
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas, padding: spacing[4], gap: spacing[3] },
  input: {
    backgroundColor: colors.surfaceBase,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 999,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.textPrimary,
    ...textStyles.bodyMd,
  },
  warning: { ...textStyles.caption, color: colors.amber },
  list: { gap: spacing[2] },
  feedContent: { paddingBottom: spacing[8] },
  empty: { ...textStyles.bodySm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing[6] },
  spinner: { marginTop: spacing[6] },
  showMore: {
    minHeight: 44,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[5],
  },
  showMoreLabel: { ...textStyles.bodyStrong, color: colors.accent },
});
