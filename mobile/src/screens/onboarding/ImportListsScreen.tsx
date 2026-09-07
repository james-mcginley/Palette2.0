import React from 'react';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

export function ImportListsScreen() {
  return (
    <ScreenPlaceholder
      title="Import your existing lists"
      note="Onboarding step 1 of 4 in the prototype: offer to import from Letterboxd/Goodreads/Spotify exports. Not wired up — decide in Phase 2 whether this is a real importer or a soft skip."
    />
  );
}
