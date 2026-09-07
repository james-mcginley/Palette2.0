import React from 'react';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

export function ProfileScreen() {
  return (
    <ScreenPlaceholder
      title="Profile"
      note="Bio, badges grid (user_badges), monthly mosaic, user-created bundles (curations). Mosaic specifically needs MonthlyMosaic from the ported logging components — see mobile/src/components/logging."
    />
  );
}
