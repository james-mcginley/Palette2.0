import React from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadow, spacing, textStyles } from '@/theme/tokens';
import { MEDIA_LABEL, type MediaType } from '@/lib/types/media';

interface MediaRowProps {
  title: string;
  mediaType: MediaType;
  imageUrl?: string;
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
  /** Slot for a ReportBlockMenu on UGC rows (Feed/Friends) — MediaRow itself
   *  stays ignorant of moderation, the caller just drops the menu in here. */
  moreMenu?: React.ReactNode;
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
  imageUrl,
  creator,
  releaseYear,
  rating,
  metaText,
  onPress,
  trailingLabel,
  onPressTrailing,
  trailingActive,
  moreMenu,
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
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={styles.coverFallback} />
        )}
        <View style={styles.infoText}>
          <Text style={styles.tag}>{MEDIA_LABEL[mediaType]}</Text>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {meta ? <Text style={styles.meta} numberOfLines={2}>{meta}</Text> : null}
        </View>
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

      {moreMenu}
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
    overflow: 'hidden',
    minHeight: 44,
    ...shadow.card,
  },
  info: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  // 46x62 (a poster-ish 3:4 ratio) matches the design's Feed/Library card
  // cover art — the field the UI is built to render without, per
  // normalizeMedia.ts's "never invent data" constraint, hence the fallback
  // box below rather than a placeholder image.
  cover: { width: 46, height: 62, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft },
  coverFallback: { width: 46, height: 62, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceRaised },
  infoText: { flex: 1, justifyContent: 'center', gap: 2 },
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
