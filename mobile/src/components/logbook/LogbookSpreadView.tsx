import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LogbookPage } from './LogbookPage';
import { colors } from '@/theme/tokens';
import type { LogbookSpread } from '@/lib/api/logbook';

interface LogbookSpreadViewProps {
  spread: LogbookSpread;
}

/** The two facing pages plus the spine gutter and page shadow —
 *  "what sells two pages as one physical spread" (EDITORIAL_SYSTEM.md §2). */
export function LogbookSpreadView({ spread }: LogbookSpreadViewProps) {
  return (
    <View style={styles.shadowWrap}>
      <View style={styles.spread}>
        <LogbookPage items={spread.leftItems} headerLabel={spread.label} folio={spread.folioLeft} side="left" />
        <LogbookPage items={spread.rightItems} folio={spread.folioRight} side="right" />

        <LinearGradient
          pointerEvents="none"
          colors={[colors.paperShade, 'transparent', colors.paperShade]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={[0, 0.5, 1]}
          style={styles.gutter}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    flex: 1,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  spread: { flex: 1, flexDirection: 'row', borderRadius: 4, overflow: 'hidden' },
  gutter: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 20, marginLeft: -10, opacity: 0.6 },
});
