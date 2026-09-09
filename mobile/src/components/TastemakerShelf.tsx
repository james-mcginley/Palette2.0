import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTastemakerShelf } from '@/lib/api/feed';
import { Cover } from '@/components/Cover';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

/**
 * PLAN.md Phase 3's remaining Feed piece: a shelf of what flagged tastemaker
 * accounts (`profiles.is_tastemaker`) have logged, independent of who you
 * personally follow. Renders nothing at all — not an empty-state message —
 * until an account is actually flagged and has logged something public;
 * every user's Feed otherwise showing a permanent "no tastemakers yet"
 * section would read as broken, not honest.
 */
export function TastemakerShelf() {
  const { data } = useTastemakerShelf();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.root}>
      <Text style={styles.sectionTitle}>From tastemakers</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {data.map((log) => (
          <Pressable
            key={log.id}
            style={styles.card}
            onPress={() => navigation.navigate('MediaDetail', { mediaId: log.media_id, media: log.media_snapshot })}
          >
            <Cover imageUrl={log.media_snapshot.imageUrl} title={log.media_snapshot.title} style={styles.cover} />
            <Text style={styles.title} numberOfLines={1}>{log.media_snapshot.title}</Text>
            <Text style={styles.author} numberOfLines={1}>
              {log.author?.display_name ?? log.author?.handle ?? 'Tastemaker'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: spacing[4] },
  sectionTitle: { ...textStyles.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: spacing[2] },
  row: { gap: spacing[3] },
  card: { width: 100 },
  cover: { width: '100%', aspectRatio: 2 / 3, backgroundColor: colors.surfaceRaised, marginBottom: 4, borderRadius: radii.sm },
  title: { ...textStyles.caption, color: colors.textPrimary, fontWeight: '700' },
  author: { ...textStyles.caption, color: colors.textSecondary },
});
