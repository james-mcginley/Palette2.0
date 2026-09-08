import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import type { RootStackParamList } from '@/navigation/types';
import { useAsk, useAskAnswers, useCreateAnswer } from '@/lib/api/asks';
import { ReportBlockMenu } from '@/components/moderation/ReportBlockMenu';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import { MEDIA_LABEL } from '@/lib/types/media';

type Props = NativeStackScreenProps<RootStackParamList, 'AskDetail'>;

export function AskDetailScreen({ route }: Props) {
  const { askId, question } = route.params;
  const { data: ask } = useAsk(askId);
  const { data: answers, isLoading: isLoadingAnswers } = useAskAnswers(askId);
  const createAnswer = useCreateAnswer(askId);
  const [body, setBody] = useState('');

  const canAnswer = ask?.status === 'open';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            {ask?.media_type ? <Text style={styles.tag}>{MEDIA_LABEL[ask.media_type]}</Text> : null}
            <Text style={styles.question}>{ask?.question ?? question}</Text>
            <Text style={styles.meta}>
              Asked by {ask?.author?.display_name ?? ask?.author?.handle ?? 'someone'}
            </Text>
          </View>
          {ask ? (
            <ReportBlockMenu
              contentKind="ask"
              contentId={ask.id}
              authorId={ask.user_id}
              authorName={ask.author?.display_name ?? ask.author?.handle ?? 'this member'}
            />
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Answers</Text>
        {isLoadingAnswers ? (
          <ActivityIndicator color={colors.accent} style={styles.spinner} />
        ) : answers && answers.length > 0 ? (
          answers.map((a) => (
            <View key={a.id} style={styles.answerRow}>
              <View style={styles.answerText}>
                <Text style={styles.answerBody}>{a.body}</Text>
                <Text style={styles.meta}>{a.author?.display_name ?? a.author?.handle ?? 'Someone'}</Text>
              </View>
              <ReportBlockMenu
                contentKind="ask_answer"
                contentId={a.id}
                authorId={a.user_id}
                authorName={a.author?.display_name ?? a.author?.handle ?? 'this member'}
              />
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No answers yet.</Text>
        )}
      </ScrollView>

      {canAnswer ? (
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            placeholder="Share your pick…"
            placeholderTextColor={colors.textDim}
            value={body}
            onChangeText={setBody}
            multiline
          />
          <Pressable
            style={[styles.sendButton, !body.trim() && styles.sendButtonDisabled]}
            disabled={!body.trim() || createAnswer.isPending}
            onPress={() => createAnswer.mutate(body.trim(), { onSuccess: () => setBody('') })}
          >
            <Text style={styles.sendLabel}>Post</Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[6] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[2] },
  headerText: { flex: 1, gap: 4 },
  tag: { ...textStyles.monoSm, color: colors.amber, textTransform: 'uppercase', letterSpacing: 1.5 },
  question: { ...textStyles.headingLg, color: colors.textPrimary },
  meta: { ...textStyles.caption, color: colors.textSecondary },
  sectionTitle: { ...textStyles.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: spacing[2] },
  answerRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    backgroundColor: colors.surfaceBase, borderWidth: 1, borderColor: colors.borderDefault,
    borderRadius: radii.md, padding: spacing[3],
  },
  answerText: { flex: 1, gap: 4 },
  answerBody: { ...textStyles.bodyMd, color: colors.textPrimary },
  spinner: { marginTop: spacing[4] },
  empty: { ...textStyles.bodySm, color: colors.textSecondary },
  composer: {
    flexDirection: 'row', gap: spacing[2], alignItems: 'flex-end',
    padding: spacing[4], borderTopWidth: 1, borderTopColor: colors.borderSoft, backgroundColor: colors.surfaceCanvas,
  },
  composerInput: {
    flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderColor: colors.borderDefault,
    borderRadius: radii.md, padding: spacing[3], color: colors.textPrimary, ...textStyles.bodyMd,
  },
  sendButton: {
    minHeight: 44, paddingHorizontal: spacing[4], borderRadius: radii.full,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendLabel: { ...textStyles.bodyStrong, color: colors.textOnAccent },
});
