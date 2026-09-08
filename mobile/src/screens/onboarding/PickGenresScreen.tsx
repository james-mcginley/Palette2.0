import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import type { OnboardingStackParamList } from '@/navigation/types';

export function PickGenresScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  return (
    <OnboardingStep
      title="What are you into?"
      note="Genre/tag chips across all five media types should seed the initial Discover ranking rather than just sit on the profile unused — that ranking doesn't exist yet, so this step is a soft skip for now."
      continueLabel="Skip for now"
      onContinue={() => navigation.navigate('FollowPeople')}
    />
  );
}
