import { onlineManager, QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { registerLogMutationDefaults } from '@/lib/api/logs';

/**
 * "Your library is yours, discovery is not" (ARCHITECTURE.md §5).
 *
 * Only user-owned query keys are persisted and rehydrated offline; search
 * and trending results are cheap to refetch and go stale fast, so they stay
 * memory-only and simply show their last-known value with the offline
 * banner rather than pretending to fetch.
 */
const PERSISTED_QUERY_KEY_PREFIXES = ['library', 'lists', 'profile', 'logs'];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error: any) => failureCount < 2 && error?.status !== 429,
    },
  },
});

// Registered once here, at module load — before PersistQueryClientProvider
// ever gets a chance to rehydrate a paused mutation and try to resume it.
// See lib/api/logs.ts for why default handlers can't live in a component.
registerLogMutationDefaults(queryClient);

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'palette-query-cache',
});

export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24 * 7,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[] }) =>
      PERSISTED_QUERY_KEY_PREFIXES.includes(String(query.queryKey[0])),
    // Only a mutation that never got to fire (offline, force-quit before
    // reconnecting) needs to survive a restart — anything else either
    // already succeeded or already reported its own error to the caller.
    shouldDehydrateMutation: (mutation: { state: { isPaused: boolean } }) => mutation.state.isPaused,
  },
};

/**
 * Wires TanStack Query's online detection to NetInfo. Call once at app
 * start (see src/App.tsx). Without this, Query falls back to the browser's
 * navigator.onLine, which doesn't exist in React Native and leaves it
 * assuming "always online".
 */
export function configureOnlineManager(): () => void {
  return NetInfo.addEventListener((state) => {
    onlineManager.setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
}
