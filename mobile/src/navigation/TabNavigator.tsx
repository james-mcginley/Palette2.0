import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from './types';
import { FeedScreen } from '@/screens/FeedScreen';
import { FriendsScreen } from '@/screens/FriendsScreen';
import { DiscoverScreen } from '@/screens/DiscoverScreen';
import { LibraryScreen } from '@/screens/LibraryScreen';
import { colors, radii } from '@/theme/tokens';

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

export function TabNavigator() {
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

const styles = StyleSheet.create({
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
