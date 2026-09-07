import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import { MEDIA_LABEL, type MediaType } from '@/lib/types/media';

interface MediaRowProps {
  title: string;
  mediaType: MediaType;
  creator?: string;
  releaseYear?: number;
  rating?: number;
  /** Overrides the default creator/year meta line — e.g. a review snippet on Feed. */
  metaText?: string;
  onPress?: () => void;
  /** A second, independently focusable action (e.g. "Mark consumed") — kept
   *  outside the info Pressable's accessible group rather than nested inside
   *  it, per ARCHITECTURE.md §8: one accessible element for the descriptive
   *  content, not a swipe-through of poster/title/creator/year separately. */
  trailingLabel?: string;
  onPressTrailing?: () => void;
  trailingActive?: boolean;
}

/**
 * Shared row primitive for Feed/Discover/Library. Collapses title, creator,
 * year, medium and rating into one accessible element with a dynamic label
 * built only from fields that actually exist — never announces "undefined"
 * for a missing creator (ARCHITECTURE.md §8).
 */
export function MediaRow({
  title,
  mediaType,
  creator,
  releaseYear,
  rating,
  metaText,
  onPress,
  trailingLabel,
  onPressTrailing,
  trailingActive,
}: MediaRowProps) {
  const accessibilityLabel = [
    title,
    creator,
    releaseYear ? String(releaseYear) : null,
    MEDIA_LABEL[mediaType],
    rating ? `rated ${rating} out of 5` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const meta = metaText ?? [creator, releaseYear ? String(releaseYear) : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.info, pressed && styles.pressed]}
        onPress={onPress}
        disabled={!onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={onPress ? 'Opens details' : undefined}
        hitSlop={8}
      >
        <Text style={styles.tag}>{MEDIA_LABEL[mediaType]}</Text>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {meta ? <Text style={styles.meta} numberOfLines={2}>{meta}</Text> : null}
      </Pressable>

      {trailingLabel ? (
        <Pressable
          style={({ pressed }) => [
            styles.trailing,
            trailingActive && styles.trailingActive,
            pressed && styles.pressed,
          ]}
          onPress={onPressTrailing}
          accessibilityRole="button"
          accessibilityLabel={trailingLabel}
          hitSlop={8}
        >
          <Text style={[styles.trailingLabel, trailingActive && styles.trailingLabelActive]}>
            {trailingLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceBase,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.md,
    minHeight: 44,
  },
  info: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: 2,
  },
  pressed: { opacity: 0.7 },
  tag: { ...textStyles.monoSm, color: colors.amber, textTransform: 'uppercase', letterSpacing: 1.5 },
  title: { ...textStyles.bodyStrong, color: colors.textPrimary },
  meta: { ...textStyles.bodySm, color: colors.textSecondary },
  trailing: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    marginRight: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  trailingActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  trailingLabel: { ...textStyles.caption, color: colors.textSecondary, textTransform: 'uppercase' },
  trailingLabelActive: { color: colors.accent },
});
