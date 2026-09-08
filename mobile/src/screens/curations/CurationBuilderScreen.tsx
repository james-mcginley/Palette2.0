import React, { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import type { RootStackParamList } from '@/navigation/types';
import { useMediaSearch } from '@/lib/api/mediaSearch';
import {
  useCuration, useCurationItems, useCreateCuration, useUpdateCuration,
  useAddCurationItem, useRemoveCurationItem, useDeleteCuration, type CurationVisibility,
} from '@/lib/api/curations';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import { MEDIA_LABEL } from '@/lib/types/media';

type Props = NativeStackScreenProps<RootStackParamList, 'CurationBuilder'>;

const VISIBILITY_OPTIONS: { key: CurationVisibility; label: string }[] = [
  { key: 'public', label: 'Public' },
  { key: 'friends', label: 'Friends' },
  { key: 'private', label: 'Private' },
];

/**
 * The missing piece that made Discover's editorial grid and
 * CurationDetailScreen render nothing but their own empty state: the schema
 * for curations existed since Phase 0, but nothing let a user create one.
 * Create and edit share one screen — a brand-new curation is really just an
 * edit session that starts with an insert.
 */
export function CurationBuilderScreen({ route, navigation }: Props) {
  const [curationId, setCurationId] = useState(route.params?.curationId);
  const isEditing = Boolean(curationId);

  const { data: curation } = useCuration(curationId);
  const { data: items } = useCurationItems(curationId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<CurationVisibility>('public');

  useEffect(() => {
    if (curation) {
      setTitle(curation.title);
      setDescription(curation.description ?? '');
      setVisibility(curation.visibility);
    }
  }, [curation]);

  const createCuration = useCreateCuration();
  const updateCuration = useUpdateCuration(curationId ?? '');
  const addItem = useAddCurationItem(curationId ?? '');
  const removeItem = useRemoveCurationItem(curationId ?? '');
  const deleteCuration = useDeleteCuration();

  const [query, setQuery] = useState('');
  const { items: searchResults, isQueryLongEnough } = useMediaSearch(query);
  const addedIds = new Set((items ?? []).map((i) => i.media_id));

  const handleSave = () => {
    if (!title.trim()) return;
    if (curationId) {
      updateCuration.mutate({ title: title.trim(), description, visibility });
    } else {
      createCuration.mutate(
        { title: title.trim(), description, visibility },
        { onSuccess: (newId) => setCurationId(newId) }
      );
    }
  };

  const handleDelete = () => {
    if (!curationId) return;
    Alert.alert('Delete this collection?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => deleteCuration.mutate(curationId, { onSuccess: () => navigation.goBack() }),
      },
    ]);
  };

  const isSaving = createCuration.isPending || updateCuration.isPending;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Urban Loneliness"
        placeholderTextColor={colors.textDim}
        maxLength={120}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="What ties these together?"
        placeholderTextColor={colors.textDim}
        multiline
        maxLength={500}
      />

      <View style={styles.visibilityRow}>
        {VISIBILITY_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.visibilityPill, visibility === opt.key && styles.visibilityPillActive]}
            onPress={() => setVisibility(opt.key)}
          >
            <Text style={[styles.visibilityLabel, visibility === opt.key && styles.visibilityLabelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={!title.trim() || isSaving}>
        {isSaving ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <Text style={styles.saveLabel}>{isEditing ? 'Save changes' : 'Create collection'}</Text>
        )}
      </Pressable>

      {isEditing ? (
        <>
          <Text style={styles.sectionTitle}>Items ({items?.length ?? 0})</Text>
          {(items ?? []).map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemTag}>{MEDIA_LABEL[item.media_type]}</Text>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.media_snapshot.title}</Text>
              <Pressable onPress={() => removeItem.mutate(item.id)} hitSlop={8}>
                <Text style={styles.removeLabel}>Remove</Text>
              </Pressable>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Add items</Text>
          <TextInput
            style={styles.input}
            placeholder="Search to add…"
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {isQueryLongEnough && (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const alreadyAdded = addedIds.has(item.id);
                return (
                  <Pressable
                    style={styles.searchRow}
                    disabled={alreadyAdded}
                    onPress={() => addItem.mutate(item)}
                  >
                    <Text style={styles.itemTag}>{MEDIA_LABEL[item.mediaType]}</Text>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.addLabel}>{alreadyAdded ? 'Added' : 'Add'}</Text>
                  </Pressable>
                );
              }}
            />
          )}

          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteLabel}>Delete collection</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[5], gap: spacing[2], paddingBottom: spacing[8] },
  label: { ...textStyles.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: spacing[3] },
  input: {
    backgroundColor: colors.surfaceBase, borderWidth: 1, borderColor: colors.borderDefault,
    borderRadius: radii.sm, padding: spacing[3], color: colors.textPrimary, ...textStyles.bodyMd,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  visibilityRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] },
  visibilityPill: {
    flex: 1, minHeight: 40, borderRadius: radii.full, borderWidth: 1, borderColor: colors.borderDefault,
    alignItems: 'center', justifyContent: 'center',
  },
  visibilityPillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  visibilityLabel: { ...textStyles.caption, color: colors.textSecondary },
  visibilityLabelActive: { color: colors.accent },
  saveButton: {
    marginTop: spacing[4], minHeight: 50, borderRadius: radii.full, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  saveLabel: { ...textStyles.bodyStrong, color: colors.textOnAccent },
  sectionTitle: { ...textStyles.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: spacing[5] },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.surfaceBase, borderWidth: 1, borderColor: colors.borderDefault,
    borderRadius: radii.md, padding: spacing[3], marginTop: spacing[2],
  },
  itemTag: { ...textStyles.monoSm, color: colors.amber, textTransform: 'uppercase' },
  itemTitle: { ...textStyles.bodyMd, color: colors.textPrimary, flex: 1 },
  removeLabel: { ...textStyles.caption, color: colors.danger },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  addLabel: { ...textStyles.caption, color: colors.accent },
  deleteButton: { marginTop: spacing[6], alignItems: 'center', padding: spacing[3] },
  deleteLabel: { ...textStyles.bodySm, color: colors.danger },
});
