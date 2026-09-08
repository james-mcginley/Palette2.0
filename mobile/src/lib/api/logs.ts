import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';
import type { MediaItem, MediaType } from '@/lib/types/media';

export interface LogRow {
  id: string;
  user_id: string;
  media_id: string;
  media_type: MediaType;
  media_snapshot: MediaItem;
  rating: number | null;
  review: string | null;
  logged_on: string;
  visibility: 'public' | 'friends' | 'private';
  created_at: string;
}

export interface CreateLogInput {
  media: MediaItem;
  rating?: number;
  review?: string;
  visibility?: LogRow['visibility'];
  /** YYYY-MM-DD. Defaults to today server-side if omitted. */
  loggedOn?: string;
}

const CREATE_LOG_MUTATION_KEY = ['createLog'];

/**
 * The library query — persisted, and the one query that must render fully
 * from cache with zero network (ARCHITECTURE.md §5's "the screen is never
 * blank" requirement). Query key starts with 'library' so the persister in
 * state/queryClient.ts picks it up.
 */
export function useMyLogs() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['library', 'logs', userId],
    queryFn: async (): Promise<LogRow[]> => {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('user_id', userId)
        .order('logged_on', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });
}

/**
 * Default handlers can't close over hook state — they're registered once, at
 * app start, and rehydrated by the persister after a restart with no React
 * tree around them (ARCHITECTURE.md §5: "writes while offline must still
 * work"). Both read the signed-in user id straight from the Supabase client
 * instead of `useAuthStore`.
 */
async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('not signed in');
  return userId;
}

/**
 * One RPC call (log_media — see 0010_log_media_rpc.sql), not two client-side
 * inserts: logging something also marks it consumed in the Library
 * atomically, which is what lets this whole mutation be replayed as a single
 * unit by the offline queue without risking the log landing but the library
 * update silently not (or vice versa).
 */
async function createLogMutationFn(input: CreateLogInput): Promise<LogRow> {
  await getCurrentUserId(); // fail fast if signed out, before spending a request
  const { data, error } = await supabase.rpc('log_media', {
    p_media_id: input.media.id,
    p_media_type: input.media.mediaType,
    p_media_snapshot: input.media,
    p_rating: input.rating ?? null,
    p_review: input.review ?? null,
    p_visibility: input.visibility ?? 'public',
    p_logged_on: input.loggedOn ?? new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
  return data as LogRow;
}

interface CreateLogContext {
  userId: string;
  previousLogs: LogRow[] | undefined;
}

/**
 * Registers the mutation defaults `useCreateLog` below relies on. Call once,
 * at module load (see state/queryClient.ts) — not inside a component or
 * effect — so the defaults exist before `PersistQueryClientProvider` tries
 * to rehydrate and resume any mutation that was paused offline when the app
 * was last force-quit.
 */
export function registerLogMutationDefaults(queryClient: QueryClient): void {
  queryClient.setMutationDefaults(CREATE_LOG_MUTATION_KEY, {
    mutationFn: createLogMutationFn,
    onMutate: async (input: CreateLogInput): Promise<CreateLogContext> => {
      const userId = await getCurrentUserId();
      const queryKey = ['library', 'logs', userId];
      await queryClient.cancelQueries({ queryKey });
      const previousLogs = queryClient.getQueryData<LogRow[]>(queryKey);

      const optimisticRow: LogRow = {
        id: `optimistic-${Date.now()}`,
        user_id: userId,
        media_id: input.media.id,
        media_type: input.media.mediaType,
        media_snapshot: input.media,
        rating: input.rating ?? null,
        review: input.review ?? null,
        logged_on: input.loggedOn ?? new Date().toISOString().slice(0, 10),
        visibility: input.visibility ?? 'public',
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<LogRow[]>(queryKey, (old: LogRow[] | undefined) => [optimisticRow, ...(old ?? [])]);

      return { userId, previousLogs };
    },
    onError: (_err, _input, context) => {
      if (context) {
        queryClient.setQueryData(['library', 'logs', context.userId], context.previousLogs);
      }
    },
    onSettled: (_data, _err, _input, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: ['library', 'logs', context.userId] });
        queryClient.invalidateQueries({ queryKey: ['library', 'items', context.userId] });
      }
    },
  });
}

/**
 * Logging is the core action and must work offline (ARCHITECTURE.md §5): with
 * the default `networkMode: 'online'`, calling `mutate()` while offline skips
 * the network call entirely and marks the mutation "paused" rather than
 * failing — `onMutate`'s optimistic update still runs immediately, so the log
 * appears at once. The persister in state/queryClient.ts persists any paused
 * mutation to disk, and `resumePausedMutations()` (called after rehydration
 * in App.tsx) replays it the moment the app relaunches with a connection —
 * so a log made right before a force-quit is not lost.
 */
export function useCreateLog() {
  return useMutation<LogRow, Error, CreateLogInput, CreateLogContext>({
    mutationKey: CREATE_LOG_MUTATION_KEY,
  });
}
