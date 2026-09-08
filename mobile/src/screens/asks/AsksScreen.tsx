import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useOpenAsks, useMyAsks, useCreateAsk, type AskRow } from '@/lib/api/asks';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import { MEDIA_LABEL } from '@/lib/types/media';
import type { RootStackParamList } from '@/navigation/types';

/**
 * The design's Discover-filter "Asks" view (Palette.dc.html's
 * `discFilters`/`askCards`), reached here as its own screen rather than a
 * Discover filter chip — same content, smaller footprint to wire up.
 * "Ask for a rec" from the (+) sheet was explicitly deferred in
 * QuickCaptureScreen "until asks/curations have any UI at all" — this is
 * that UI.
 */
export function AsksScreen() {
  const [isComposing, setIsComposing] = useState(false);
  const [question, setQuestion] = useState('');
  const openAsks = useOpenAsks();
  const myAsks = useMyAsks();
  const createAsk = useCreateAsk();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const openComposer = () => {
    setQuestion('');
    setIsComposing(true);
  };

  const submit = () => {
    if (!question.trim()) return;
    createAsk.mutate(
      { question: question.trim() },
      { onSuccess: () => setIsComposing(false) }
    );
  };

  const renderAsk = (item: AskRow, showStatus: boolean) => (
    <Pressable
      key={item.id}
      style={styles.askRow}
      onPress={() => navigation.navigate('AskDetail', { askId: item.id, question: item.question })}
    >
      {item.media_type ? <Text style={styles.askTag}>{MEDIA_LABEL[item.media_type]}</Text> : null}
      <Text style={styles.askQuestion} numberOfLines={3}>{item.question}</Text>
      <Text style={styles.askMeta}>
        {item.author?.display_name ?? item.author?.handle ?? 'Someone'}
        {showStatus ? ` · ${item.status}` : ''}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable style={styles.newAskButton} onPress={openComposer} accessibilityRole="button">
        <Text style={styles.newAskLabel}>Ask for a recommendation</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Open asks</Text>
      {openAsks.isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      ) : openAsks.data && openAsks.data.length > 0 ? (
        openAsks.data.map((item) => renderAsk(item, false))
      ) : (
        <Text style={styles.empty}>No open asks right now.</Text>
      )}

      <Text style={styles.sectionTitle}>Your asks</Text>
      {myAsks.data && myAsks.data.length > 0 ? (
        myAsks.data.map((item) => renderAsk(item, true))
      ) : (
        <Text style={styles.empty}>You haven't asked anything yet.</Text>
      )}

      <ConfirmDialog
        visible={isComposing}
        onClose={() => setIsComposing(false)}
        title="Ask for a recommendation"
        message="Friends and the community can answer with their own pick."
        input={{ value: question, onChangeText: setQuestion, placeholder: 'Recommend me a slow-burn thriller…' }}
        confirmLabel="Post"
        isSubmitting={createAsk.isPending}
        onConfirm={submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[8] },
  newAskButton: {
    minHeight: 50, borderRadius: radii.full, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2],
  },
  newAskLabel: { ...textStyles.bodyStrong, color: colors.textOnAccent },
  sectionTitle: { ...textStyles.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: spacing[2] },
  askRow: {
    backgroundColor: colors.surfaceBase, borderWidth: 1, borderColor: colors.borderDefault,
    borderRadius: radii.md, padding: spacing[3], gap: 4,
  },
  askTag: { ...textStyles.monoSm, color: colors.amber, textTransform: 'uppercase', letterSpacing: 1.5 },
  askQuestion: { ...textStyles.bodyStrong, color: colors.textPrimary },
  askMeta: { ...textStyles.caption, color: colors.textSecondary },
  spinner: { marginTop: spacing[4] },
  empty: { ...textStyles.bodySm, color: colors.textSecondary },
});
