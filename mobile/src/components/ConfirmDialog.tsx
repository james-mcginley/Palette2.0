import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';

interface ConfirmDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  /** Optional free-text field — used for a report's detail and nothing else so far. */
  input?: { value: string; onChangeText: (v: string) => void; placeholder?: string };
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  isSubmitting?: boolean;
  /** A single-button acknowledgement (the report confirmation copy) has no
   *  real "cancel" — set this to hide that button rather than rendering a
   *  ghost cancel that means the same thing as confirm. */
  hideCancel?: boolean;
}

/** Centered modal for the "are you sure" and "here's what happens" copy
 *  COMPLIANCE.md §1 requires around blocking and reporting. */
export function ConfirmDialog({
  visible, onClose, title, message, input, confirmLabel, onConfirm, destructive, isSubmitting, hideCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={hideCancel ? undefined : onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {input ? (
            <TextInput
              style={styles.input}
              value={input.value}
              onChangeText={input.onChangeText}
              placeholder={input.placeholder}
              placeholderTextColor={colors.textDim}
              multiline
              maxLength={1000}
            />
          ) : null}

          <View style={styles.actions}>
            {!hideCancel && (
              <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={isSubmitting}>
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.button, destructive ? styles.destructiveButton : styles.confirmButton]}
              onPress={onConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textOnAccent} />
              ) : (
                <Text style={destructive ? styles.destructiveLabel : styles.confirmLabel}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing[5] },
  card: {
    width: '100%',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing[4],
    gap: spacing[3],
  },
  title: { ...textStyles.headingMd, color: colors.textPrimary },
  message: { ...textStyles.bodySm, color: colors.textSecondary },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.sm,
    padding: spacing[3],
    color: colors.textPrimary,
    textAlignVertical: 'top',
    ...textStyles.bodySm,
  },
  actions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] },
  button: { flex: 1, minHeight: 44, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { borderWidth: 1, borderColor: colors.borderDefault },
  cancelLabel: { ...textStyles.bodyStrong, color: colors.textSecondary },
  confirmButton: { backgroundColor: colors.accent },
  confirmLabel: { ...textStyles.bodyStrong, color: colors.textOnAccent },
  destructiveButton: { backgroundColor: colors.danger },
  destructiveLabel: { ...textStyles.bodyStrong, color: colors.textPrimary },
});
