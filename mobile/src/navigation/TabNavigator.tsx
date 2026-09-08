import React, { useEffect, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from './types';
import { FeedScreen } from '@/screens/FeedScreen';
import { FriendsScreen } from '@/screens/FriendsScreen';
import { DiscoverScreen } from '@/screens/DiscoverScreen';
import { LibraryScreen } from '@/screens/LibraryScreen';
import { colors, radii } from '@/theme/tokens';
import { useMyLogs } from '@/lib/api/logs';
import { useEntryAnimationStore } from '@/state/entryAnimationStore';
import { EntryAnimation, type EntryAnimationCover } from '@/components/entry/EntryAnimation';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * (+) isn't a real tab screen — it opens the quick-capture flow as a modal
 * over whichever tab you're on (the brief's "floating center action
 * button"). `tabBarButton` intercepts the press so React Navigation never
 * tries to render a screen for it.
 */
function AddTabButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Pressable
      style={styles.addButton}
      onPress={() => navigation.navigate('QuickCapture')}
      accessibilityRole="button"
      accessibilityLabel="Log or start something new"
    >
      <Text style={styles.addLabel}>+</Text>
    </Pressable>
  );
}

function AddPlaceholderScreen() {
  return null;
}

function TabNavigatorContent() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surfaceBase, borderTopColor: colors.borderDefault },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen
        name="Add"
        component={AddPlaceholderScreen}
        options={{ tabBarButton: () => <AddTabButton /> }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
    </Tab.Navigator>
  );
}

/**
 * EDITORIAL_SYSTEM.md §3: the entry animation runs on cold launch only and
 * "never blocks data fetch — Feed loads behind it." `TabNavigatorContent`
 * (and Feed's own query inside it) mounts unconditionally and immediately;
 * the animation is a pure overlay on top that hides itself when done,
 * exactly like a loading screen it explicitly must not be.
 */
export function TabNavigator() {
  const hasPlayed = useEntryAnimationStore((s) => s.hasPlayed);
  const markPlayed = useEntryAnimationStore((s) => s.markPlayed);
  const { data: logs, isLoading } = useMyLogs();

  const covers: EntryAnimationCover[] = useMemo(() => {
    if (!logs) return [];
    return [...logs]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5)
      .map((l) => ({ id: l.id, imageUrl: l.media_snapshot.imageUrl, title: l.media_snapshot.title }));
  }, [logs]);

  useEffect(() => {
    // Nothing to draw for a brand-new account — skip straight to Feed
    // rather than play the sequence with zero covers.
    if (!hasPlayed && !isLoading && covers.length === 0) markPlayed();
  }, [hasPlayed, isLoading, covers.length, markPlayed]);

  return (
    <View style={styles.root}>
      <TabNavigatorContent />
      {!hasPlayed && !isLoading && covers.length > 0 && (
        <EntryAnimation covers={covers} onDone={markPlayed} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  addButton: {
    top: -18,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  addLabel: { fontSize: 28, lineHeight: 30, color: colors.textOnAccent },
});
