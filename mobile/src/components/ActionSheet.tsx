import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: ActionSheetOption[];
}

/**
 * A plain cross-platform bottom sheet — deliberately not `ActionSheetIOS`,
 * which has no Android equivalent at all (unlike, say, haptics, which
 * degrades gracefully). ARCHITECTURE.md's "Android is wanted eventually;
 * rewriting later is worse than starting cross-platform" applies here too:
 * one implementation now beats an iOS-only path with an Android gap to
 * close during Phase 8.
 */
export function ActionSheet({ visible, onClose, title, options }: ActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {options.map((opt, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && styles.rowPressed]}
              onPress={() => {
                onClose();
                opt.onPress();
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.rowLabel, opt.destructive && styles.rowLabelDestructive]}>{opt.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.cancel} onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: spacing[6],
    paddingTop: spacing[3],
  },
  title: { ...textStyles.caption, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing[3] },
  row: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[4] },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  rowPressed: { backgroundColor: colors.surfaceBase },
  rowLabel: { ...textStyles.bodyMd, color: colors.textPrimary },
  rowLabelDestructive: { color: colors.danger },
  cancel: {
    marginTop: spacing[2],
    marginHorizontal: spacing[3],
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: { ...textStyles.bodyStrong, color: colors.textPrimary },
});
