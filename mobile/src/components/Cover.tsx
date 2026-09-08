import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';
import { colors, radii, textStyles } from '@/theme/tokens';

interface CoverProps {
  imageUrl?: string;
  /** Shown centred on the amber-dim fallback ground when there's no image. */
  title: string;
  /** expo-image's ImageStyle is a strict subset of ViewStyle (no `overflow:
   *  'scroll'`, etc.) — accepting the union lets callers pass one style prop
   *  regardless of which branch (image vs. fallback View) actually renders. */
  style?: StyleProp<ViewStyle | ImageStyle>;
  borderRadius?: number;
}

/**
 * EDITORIAL_SYSTEM.md §1 "No image" state: providers return coverless items
 * constantly, and a grey box with a broken-image glyph would break the
 * aesthetic on every other tile. A title set large on a coloured ground
 * reads as deliberate instead — so this is the one cover primitive every
 * Discover tile renders through, never a bare <Image>.
 */
export function Cover({ imageUrl, title, style, borderRadius = radii.sm }: CoverProps) {
  if (!imageUrl) {
    return (
      <View style={[styles.fallback, { borderRadius }, style]}>
        <Text style={styles.fallbackTitle} numberOfLines={4}>
          {title}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={[{ borderRadius, backgroundColor: colors.surfaceRaised }, style as StyleProp<ImageStyle>]}
      contentFit="cover"
      transition={150}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.amberDim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  fallbackTitle: {
    ...textStyles.headingMd,
    color: colors.textOnAmber,
    textAlign: 'center',
  },
});
