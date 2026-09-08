import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import type { OnboardingStackParamList } from '@/navigation/types';

export function ImportListsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  return (
    <OnboardingStep
      title="Import your existing lists"
      note="Bringing over a Letterboxd, Goodreads or Spotify export isn't wired up yet — see PLAN.md for the open decision on whether that's a real importer or stays a soft skip. Nothing here blocks the rest of setup."
      continueLabel="Skip for now"
      onContinue={() => navigation.navigate('PickLovedTitles')}
    />
  );
}
