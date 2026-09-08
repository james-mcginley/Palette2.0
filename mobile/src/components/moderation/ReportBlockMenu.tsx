import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { ActionSheet } from '@/components/ActionSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuthStore } from '@/state/authStore';
import {
  useReportContent, useBlockUser, REPORT_REASON_LABEL,
  type ContentKind, type ReportReason,
} from '@/lib/api/moderation';
import { colors, textStyles } from '@/theme/tokens';

interface ReportBlockMenuProps {
  contentKind: ContentKind;
  contentId: string;
  authorId: string;
  authorName: string;
}

type Step = 'closed' | 'menu' | 'reasons' | 'detail' | 'blockConfirm' | 'thanks';

const REASON_ORDER: ReportReason[] = [
  'spam', 'harassment', 'hate', 'sexual', 'violence', 'copyright', 'misinformation', 'other',
];

/**
 * The `⋯` entry point COMPLIANCE.md §1 requires on every public curation,
 * log and answer — "not a long-press, undiscoverable, and reviewers check
 * for this." Self-contained: renders both the trigger and every sheet the
 * flow needs, so a call site just drops this in with the four ids it
 * already has.
 */
export function ReportBlockMenu({ contentKind, contentId, authorId, authorName }: ReportBlockMenuProps) {
  const currentUserId = useAuthStore((s) => s.session?.user.id);
  const [step, setStep] = useState<Step>('closed');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');

  const reportContent = useReportContent();
  const blockUser = useBlockUser();

  if (!currentUserId || authorId === currentUserId) return null;

  const close = () => setStep('closed');

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setStep('menu')}
        accessibilityRole="button"
        accessibilityLabel="More options"
        hitSlop={8}
      >
        <Text style={styles.triggerLabel}>⋯</Text>
      </Pressable>

      <ActionSheet
        visible={step === 'menu'}
        onClose={close}
        options={[
          { label: 'Report', onPress: () => setStep('reasons') },
          { label: `Block ${authorName}`, destructive: true, onPress: () => setStep('blockConfirm') },
        ]}
      />

      <ActionSheet
        visible={step === 'reasons'}
        onClose={close}
        title="Why are you reporting this?"
        options={REASON_ORDER.map((r) => ({
          label: REPORT_REASON_LABEL[r],
          onPress: () => {
            setReason(r);
            setStep('detail');
          },
        }))}
      />

      <ConfirmDialog
        visible={step === 'detail'}
        onClose={close}
        title="Add any detail?"
        message="Optional — this helps us review it faster."
        input={{ value: detail, onChangeText: setDetail, placeholder: 'What happened? (optional)' }}
        confirmLabel="Submit report"
        isSubmitting={reportContent.isPending}
        onConfirm={() => {
          if (!reason) return;
          reportContent.mutate(
            { contentKind, contentId, authorId, reason, detail },
            { onSuccess: () => { setDetail(''); setStep('thanks'); } }
          );
        }}
      />

      <ConfirmDialog
        visible={step === 'thanks'}
        onClose={close}
        title="Thanks."
        message="We review reports within 24 hours."
        confirmLabel="Done"
        hideCancel
        onConfirm={close}
      />

      <ConfirmDialog
        visible={step === 'blockConfirm'}
        onClose={close}
        title={`Block ${authorName}?`}
        message={`You won't see ${authorName}'s logs or lists, and they won't see yours.`}
        confirmLabel="Block"
        destructive
        isSubmitting={blockUser.isPending}
        onConfirm={() => blockUser.mutate(authorId, { onSuccess: close })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  triggerLabel: { ...textStyles.headingMd, color: colors.textSecondary },
});
