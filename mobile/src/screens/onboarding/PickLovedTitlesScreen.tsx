import React from 'react';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

export function PickLovedTitlesScreen() {
  return (
    <ScreenPlaceholder
      title="Titles you've loved"
      note="Onboarding step 2 of 4: a grid of recognizable covers to tap. Needs a small curated seed set from media-search results, cached server-side so cold-start onboarding doesn't hit four providers per new user."
    />
  );
}
