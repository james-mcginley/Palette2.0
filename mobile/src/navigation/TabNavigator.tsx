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
import { colors, fonts } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { useMyLogs } from '@/lib/api/logs';
import { useEntryAnimationStore } from '@/state/entryAnimationStore';
import { EntryAnimation, type EntryAnimationCover } from '@/components/entry/EntryAnimation';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcon = (name: IconName) =>
  function TabBarIcon({ color }: { color: string }) {
    return <Icon name={name} color={color} size={20} />;
  };

/**
 * (+) isn't a real tab screen — it opens the quick-capture flow as a modal
 * over whichever tab you're on. Per Palette.dc.html:6515 ("Sits inline with
 * the rest now the bar is one flat banner, so it needs its own icon and
 * label rather than the old raised treatment") this sits inline with the
 * other four tabs, not lifted out as a floating FAB — `tabBarButton`
 * intercepts the press so React Navigation never tries to render a screen
 * for it, but the button itself now shares the same icon+label layout as
 * every other tab (see `tabBarIcon`/`tabBarLabel` on the other screens,
 * mirrored here by hand since this one isn't a real Tab.Screen render).
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
      <Icon name="plus" color={colors.textSecondary} size={20} />
      <Text style={[styles.tabLabel, { color: colors.textSecondary }]}>Add</Text>
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
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarIcon: tabIcon('rss') }} />
      <Tab.Screen name="Friends" component={FriendsScreen} options={{ tabBarIcon: tabIcon('users') }} />
      <Tab.Screen
        name="Add"
        component={AddPlaceholderScreen}
        options={{ tabBarButton: () => <AddTabButton /> }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tab.Screen name="Discover" component={DiscoverScreen} options={{ tabBarIcon: tabIcon('search') }} />
      <Tab.Screen name="Library" component={LibraryScreen} options={{ tabBarIcon: tabIcon('bookmark') }} />
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
  tabBar: {
    backgroundColor: colors.emeraldDeep,
    borderTopColor: colors.borderSoft,
  },
  tabLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // Add isn't a real Tab.Screen (see AddTabButton above), so it can't pick up
  // tabBarLabelStyle from screenOptions — this mirrors it by hand to sit
  // flush with the other four tabs rather than as a raised, unlabeled FAB.
  addButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
});
