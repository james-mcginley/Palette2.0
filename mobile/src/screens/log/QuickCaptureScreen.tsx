import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useMediaSearch } from '@/lib/api/mediaSearch';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import { MEDIA_LABEL } from '@/lib/types/media';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickCapture'>;

/**
 * The (+) sheet: search-as-you-type over media-search, tap a result to open
 * LogSheet. The brief also wants "start a list" / "build a curation" as
 * sibling actions in this same sheet — still deferred (no list/curation
 * builder UI exists yet); "ask for a rec" now has somewhere to go.
 */
export function QuickCaptureScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const { items, isQueryLongEnough } = useMediaSearch(query);

  return (
    <View style={styles.root}>
      <TextInput
        autoFocus
        style={styles.input}
        placeholder="What did you just finish?"
        placeholderTextColor={colors.textDim}
        value={query}
        onChangeText={setQuery}
      />
      <Pressable onPress={() => navigation.navigate('Asks')}>
        <Text style={styles.askLink}>Ask for a recommendation instead</Text>
      </Pressable>
      <FlatList
        data={isQueryLongEnough ? items : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.replace('LogSheet', { media: item })}>
            <Text style={styles.tag}>{MEDIA_LABEL[item.mediaType]}</Text>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas, padding: spacing[4], gap: spacing[3] },
  input: {
    backgroundColor: colors.surfaceBase,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.textPrimary,
    ...textStyles.bodyMd,
  },
  askLink: { ...textStyles.bodySm, color: colors.accent, textAlign: 'center' },
  row: { paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  tag: { ...textStyles.monoSm, color: colors.amber, textTransform: 'uppercase', letterSpacing: 1.5 },
  title: { ...textStyles.bodyStrong, color: colors.textPrimary },
});
