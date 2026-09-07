import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/tokens';

interface StarRatingProps {
  rating?: number;
  onChange: (rating: number) => void;
  size?: number;
}

/**
 * Half-star granularity: each star is two overlapping halves, tappable
 * independently, laid over a clipped filled star so half-filled reads as
 * genuinely half rather than rounded.
 */
export function StarRating({ rating, onChange, size = 32 }: StarRatingProps) {
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessible={false}>
      {[1, 2, 3, 4, 5].map((n) => {
        const isFull = rating != null && rating >= n;
        const isHalf = rating != null && rating >= n - 0.5 && rating < n;
        return (
          <View key={n} style={[styles.slot, { width: size, height: size }]}>
            <Text style={[styles.glyph, { fontSize: size, lineHeight: size }]}>★</Text>
            {(isFull || isHalf) && (
              <View style={[styles.fillClip, isHalf && styles.fillHalf]}>
                <Text style={[styles.glyph, styles.glyphFilled, { fontSize: size, lineHeight: size }]}>★</Text>
              </View>
            )}
            <Pressable
              style={styles.halfLeft}
              onPress={() => onChange(n - 0.5)}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${n - 0.5} out of 5 stars`}
              hitSlop={4}
            />
            <Pressable
              style={styles.halfRight}
              onPress={() => onChange(n)}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${n} out of 5 stars`}
              hitSlop={4}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  slot: { position: 'relative' },
  glyph: { position: 'absolute', top: 0, left: 0, width: '100%', textAlign: 'center', color: colors.borderDefault },
  glyphFilled: { color: colors.amber },
  fillClip: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' },
  fillHalf: { width: '50%' },
  halfLeft: { position: 'absolute', top: 0, left: 0, width: '50%', height: '100%' },
  halfRight: { position: 'absolute', top: 0, right: 0, width: '50%', height: '100%' },
});
