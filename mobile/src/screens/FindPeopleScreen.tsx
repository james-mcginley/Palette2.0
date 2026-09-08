import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PeopleSearchList } from '@/components/PeopleSearchList';
import { colors, spacing } from '@/theme/tokens';

/** Reached from the Friends tab — the same search-and-follow UI onboarding
 *  uses, for finding people after the fact. */
export function FindPeopleScreen() {
  return (
    <View style={styles.root}>
      <PeopleSearchList />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas, padding: spacing[4] },
});
