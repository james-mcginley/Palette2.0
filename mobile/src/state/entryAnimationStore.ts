import { create } from 'zustand';

interface EntryAnimationState {
  hasPlayed: boolean;
  markPlayed: () => void;
}

/**
 * "Runs on cold launch only — warm resume goes straight to the feed"
 * (EDITORIAL_SYSTEM.md §3). Module-level Zustand state is exactly right for
 * this: it starts `false` once per fresh JS process (a real cold launch —
 * app killed and reopened) and stays `true` for every warm resume
 * (backgrounding/foregrounding keeps the JS context alive in RN), with no
 * persistence needed or wanted — the whole point is that this does NOT
 * survive a restart in the sense of "already seen," only within one.
 */
export const useEntryAnimationStore = create<EntryAnimationState>((set) => ({
  hasPlayed: false,
  markPlayed: () => set({ hasPlayed: true }),
}));
