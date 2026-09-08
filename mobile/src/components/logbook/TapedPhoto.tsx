import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Cover } from '@/components/Cover';
import { colors, radii, textStyles } from '@/theme/tokens';
import type { LogRow } from '@/lib/api/logs';

interface TapedPhotoProps {
  log: LogRow;
}

/** Deterministic per-id angle so a photo doesn't reshuffle its tilt on
 *  every render — same technique as MonthlyMosaic's seededJitter and
 *  discoverGrid's rotationForSlot. */
function seededAngle(id: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const span = max - min;
  return min + (hash % 1000) / 1000 * span;
}

function seededSign(id: string, salt: string): 1 | -1 {
  let hash = 0;
  const s = id + salt;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return hash % 2 === 0 ? 1 : -1;
}

/**
 * "Not a clean glyph row — slightly uneven baseline (±1px) and
 * opacity: 0.88, as if pressed by hand." Half-fill uses the same
 * clipped-overlay technique as StarRating.tsx, for a genuinely half star
 * rather than reaching for a separate (and less reliably rendered) glyph.
 */
function StarStamp({ id, rating }: { id: string; rating: number }) {
  const stars = [0, 1, 2, 3, 4].map((i) => {
    const fillFraction = Math.max(0, Math.min(1, rating - i));
    const jitterY = seededSign(id, `star${i}`) * seededAngle(`${id}star${i}`, 0, 1);
    return (
      <View key={i} style={[styles.starSlot, { transform: [{ translateY: jitterY }] }]}>
        <Text style={styles.star}>☆</Text>
        {fillFraction > 0 ? (
          <View style={[styles.starFillClip, { width: `${fillFraction * 100}%` }]}>
            <Text style={styles.star}>★</Text>
          </View>
        ) : null}
      </View>
    );
  });
  return <View style={styles.starRow}>{stars}</View>;
}

/**
 * EDITORIAL_SYSTEM.md §2's "taped photo" unit: cover at a 2px paper
 * border, rotated ±1–2° fixed per item id, a translucent tape strip at one
 * corner, star stamps, and — only if the user actually wrote one — their
 * own review text as a hand-tilted margin annotation. Never a placeholder
 * note: an unreviewed log just leaves the margin empty, per that section's
 * explicit rule.
 */
export function TapedPhoto({ log }: TapedPhotoProps) {
  const rotate = seededSign(log.id, 'rotate') * seededAngle(log.id, 1, 2);
  const tapeRotate = seededSign(log.id, 'tape') * seededAngle(log.id, 8, 16);
  const noteRotate = seededSign(log.id, 'note') * seededAngle(log.id, 1, 2);

  return (
    <View style={styles.root}>
      <View style={[styles.photoWrap, { transform: [{ rotate: `${rotate}deg` }] }]}>
        <Cover
          imageUrl={log.media_snapshot.imageUrl}
          title={log.media_snapshot.title}
          style={styles.cover}
          borderRadius={2}
        />
        <View style={[styles.tape, { transform: [{ rotate: `${tapeRotate}deg` }] }]} />
      </View>

      {log.rating ? <StarStamp id={log.id} rating={log.rating} /> : null}

      {log.review ? (
        <Text style={[styles.annotation, { transform: [{ rotate: `${noteRotate}deg` }] }]} numberOfLines={4}>
          ~ {log.review} ~
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'flex-start', gap: 6, marginBottom: 18 },
  photoWrap: {
    backgroundColor: colors.paper,
    padding: 2,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cover: { width: 88, aspectRatio: 3 / 4, backgroundColor: colors.paperShade },
  tape: {
    position: 'absolute',
    top: -6,
    right: 6,
    width: 34,
    height: 14,
    backgroundColor: colors.paperTape,
  },
  starRow: { flexDirection: 'row', gap: 1 },
  starSlot: { width: 12, height: 12 },
  starFillClip: { position: 'absolute', top: 0, left: 0, height: 12, overflow: 'hidden' },
  star: { fontSize: 12, lineHeight: 12, color: colors.paperInk, opacity: 0.88 },
  annotation: {
    ...textStyles.handNote,
    color: colors.paperPencil,
    maxWidth: 120,
  },
});
