import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import type { OnboardingStackParamList } from '@/navigation/types';

export function PickLovedTitlesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  return (
    <OnboardingStep
      title="Titles you've loved"
      note="A tappable grid of recognizable covers needs a small curated seed set cached server-side, so cold-start onboarding isn't hitting four search providers per new user — not built yet, see PLAN.md."
      continueLabel="Skip for now"
      onContinue={() => navigation.navigate('PickGenres')}
    />
  );
}
