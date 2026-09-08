import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DotGrid } from './DotGrid';
import { TapedPhoto } from './TapedPhoto';
import { colors, textStyles } from '@/theme/tokens';
import type { LogRow } from '@/lib/api/logs';

interface LogbookPageProps {
  items: LogRow[];
  headerLabel?: string;
  folio: number;
  side: 'left' | 'right';
}

/** One side of a spread. Only the left page carries the week header, per
 *  EDITORIAL_SYSTEM.md §2's anatomy diagram. */
export function LogbookPage({ items, headerLabel, folio, side }: LogbookPageProps) {
  return (
    <View style={[styles.root, side === 'left' ? styles.leftPage : styles.rightPage]}>
      <DotGrid />
      {headerLabel ? <Text style={styles.header}>{headerLabel}</Text> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.map((log) => (
          <TapedPhoto key={log.id} log={log} />
        ))}
      </ScrollView>

      <Text style={styles.folio}>─── {folio} ───</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, padding: 14 },
  leftPage: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  rightPage: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  header: { ...textStyles.monoSm, color: colors.inkSoft, marginBottom: 10 },
  content: { flexGrow: 1, paddingTop: 4 },
  folio: { ...textStyles.monoSm, color: colors.paperMeta, textAlign: 'center' },
});
