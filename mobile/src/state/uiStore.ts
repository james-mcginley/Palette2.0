import { create } from 'zustand';
import type { MediaItem } from '@/lib/types/media';

interface DraftLog {
  media: MediaItem;
  rating?: number;
  review?: string;
  destination: 'feed' | 'library';
}

interface UiState {
  isOfflineBannerVisible: boolean;
  setOffline: (offline: boolean) => void;

  libraryFilter: 'all' | 'want' | 'in_progress' | 'consumed';
  setLibraryFilter: (filter: UiState['libraryFilter']) => void;

  logSheet: { open: boolean; draft: DraftLog | null };
  openLogSheet: (media: MediaItem) => void;
  updateDraftLog: (patch: Partial<Omit<DraftLog, 'media'>>) => void;
  closeLogSheet: () => void;
}

/**
 * The "small amount of genuinely local state" ARCHITECTURE.md §1 calls out:
 * filters, sheet open/closed, the in-progress draft of a log before it's
 * submitted. None of this came from a server and none of it can go stale
 * the way a Query-owned value can — it just doesn't belong there.
 */
export const useUiStore = create<UiState>((set) => ({
  isOfflineBannerVisible: false,
  setOffline: (offline) => set({ isOfflineBannerVisible: offline }),

  libraryFilter: 'all',
  setLibraryFilter: (filter) => set({ libraryFilter: filter }),

  logSheet: { open: false, draft: null },
  openLogSheet: (media) =>
    set({ logSheet: { open: true, draft: { media, destination: 'feed' } } }),
  updateDraftLog: (patch) =>
    set((state) =>
      state.logSheet.draft
        ? { logSheet: { open: true, draft: { ...state.logSheet.draft, ...patch } } }
        : state
    ),
  closeLogSheet: () => set({ logSheet: { open: false, draft: null } }),
}));
