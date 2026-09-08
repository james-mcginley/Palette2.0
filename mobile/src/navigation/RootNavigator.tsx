import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList, RootStackParamList } from './types';
import { useAuthStore } from '@/state/authStore';
import { useMyProfile } from '@/lib/api/profile';

import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';
import { ImportListsScreen } from '@/screens/onboarding/ImportListsScreen';
import { PickLovedTitlesScreen } from '@/screens/onboarding/PickLovedTitlesScreen';
import { PickGenresScreen } from '@/screens/onboarding/PickGenresScreen';
import { FollowPeopleScreen } from '@/screens/onboarding/FollowPeopleScreen';

import { TabNavigator } from './TabNavigator';
import { MailboxScreen } from '@/screens/MailboxScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { MediaDetailScreen } from '@/screens/media/MediaDetailScreen';
import { QuickCaptureScreen } from '@/screens/log/QuickCaptureScreen';
import { LogSheetScreen } from '@/screens/log/LogSheetScreen';
import { CuratorPathsScreen } from '@/screens/curator-path/CuratorPathsScreen';
import { CurationBuilderScreen } from '@/screens/curations/CurationBuilderScreen';
import { CuratorPathScreen } from '@/screens/curator-path/CuratorPathScreen';
import { CurationDetailScreen } from '@/screens/discover/CurationDetailScreen';
import { FindPeopleScreen } from '@/screens/FindPeopleScreen';
import { TermsScreen } from '@/screens/TermsScreen';
import { AsksScreen } from '@/screens/asks/AsksScreen';
import { AskDetailScreen } from '@/screens/asks/AskDetailScreen';
import { colors } from '@/theme/tokens';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * The 5-step onboarding from the brief (import lists → loved titles →
 * genres → follow people), gated in front of Sign in with Apple/Google on
 * WelcomeScreen. Auth happens on the first step, not after — you can't
 * personalize genre/people suggestions for someone who isn't signed in yet.
 */
function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="ImportLists" component={ImportListsScreen} />
      <OnboardingStack.Screen name="PickLovedTitles" component={PickLovedTitlesScreen} />
      <OnboardingStack.Screen name="PickGenres" component={PickGenresScreen} />
      <OnboardingStack.Screen name="FollowPeople" component={FollowPeopleScreen} />
    </OnboardingStack.Navigator>
  );
}

const modalScreenOptions = { presentation: 'modal' as const, headerStyle: { backgroundColor: colors.surfaceBase }, headerTintColor: colors.textPrimary };

export function RootNavigator() {
  const session = useAuthStore((s) => s.session);
  // `session` alone used to gate this — which meant the moment Apple sign-in
  // resolved on WelcomeScreen, this swapped straight to Main and the other
  // four onboarding steps (import lists, loved titles, genres, follow
  // people) never got a chance to render. `onboarding_completed_at` is
  // server-side truth set once, at the end of FollowPeopleScreen, so it
  // survives a reinstall the way a local-only flag wouldn't.
  const { data: profile, isLoading: isProfileLoading } = useMyProfile();
  const hasOnboarded = Boolean(profile?.onboarding_completed_at);

  if (session && isProfileLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!session || !hasOnboarded ? (
        <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <>
          <RootStack.Screen name="Main" component={TabNavigator} />
          <RootStack.Screen name="Mailbox" component={MailboxScreen} options={{ ...modalScreenOptions, headerShown: true, title: 'Mailbox' }} />
          <RootStack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ headerShown: true, title: '', headerStyle: modalScreenOptions.headerStyle, headerTintColor: modalScreenOptions.headerTintColor }}
          />
          <RootStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings', headerStyle: modalScreenOptions.headerStyle, headerTintColor: modalScreenOptions.headerTintColor }} />
          <RootStack.Screen name="MediaDetail" component={MediaDetailScreen} options={modalScreenOptions} />
          <RootStack.Screen name="QuickCapture" component={QuickCaptureScreen} options={modalScreenOptions} />
          <RootStack.Screen name="LogSheet" component={LogSheetScreen} options={modalScreenOptions} />
          <RootStack.Screen
            name="CuratorPaths"
            component={CuratorPathsScreen}
            options={{ headerShown: true, title: 'Curator paths', headerStyle: modalScreenOptions.headerStyle, headerTintColor: modalScreenOptions.headerTintColor }}
          />
          <RootStack.Screen
            name="CuratorPath"
            component={CuratorPathScreen}
            options={{ headerShown: true, title: '', headerStyle: modalScreenOptions.headerStyle, headerTintColor: modalScreenOptions.headerTintColor }}
          />
          <RootStack.Screen
            name="CurationDetail"
            component={CurationDetailScreen}
            options={{ headerShown: true, title: '', headerStyle: modalScreenOptions.headerStyle, headerTintColor: modalScreenOptions.headerTintColor }}
          />
          <RootStack.Screen
            name="FindPeople"
            component={FindPeopleScreen}
            options={{ headerShown: true, title: 'Find people', headerStyle: modalScreenOptions.headerStyle, headerTintColor: modalScreenOptions.headerTintColor }}
          />
          <RootStack.Screen
            name="Terms"
            component={TermsScreen}
            options={{ headerShown: true, title: 'Terms of Use', headerStyle: modalScreenOptions.headerStyle, headerTintColor: modalScreenOptions.headerTintColor }}
          />
          <RootStack.Screen
            name="Asks"
            component={AsksScreen}
            options={{ headerShown: true, title: 'Asks', headerStyle: modalScreenOptions.headerStyle, headerTintColor: modalScreenOptions.headerTintColor }}
          />
          <RootStack.Screen
            name="AskDetail"
            component={AskDetailScreen}
            options={{ headerShown: true, title: '', headerStyle: modalScreenOptions.headerStyle, headerTintColor: modalScreenOptions.headerTintColor }}
          />
          <RootStack.Screen
            name="CurationBuilder"
            component={CurationBuilderScreen}
            options={{ ...modalScreenOptions, headerShown: true, title: 'Collection' }}
          />
        </>
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceCanvas },
});
