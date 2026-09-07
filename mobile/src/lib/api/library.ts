import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';
import type { MediaItem, MediaType } from '@/lib/types/media';

export type ItemStatus = 'want' | 'in_progress' | 'consumed';

export interface LibraryItemRow {
  id: string;
  list_id: string;
  media_id: string;
  media_type: MediaType;
  media_snapshot: MediaItem;
  status: ItemStatus;
  added_at: string;
  consumed_at: string | null;
  list: { id: string; title: string; is_smart: boolean } | null;
}

/**
 * All of the caller's list_items across every list they own (RLS already
 * scopes this — no explicit user_id filter needed, since "users manage items
 * in their own lists" is the table's only SELECT policy). Grouping by status
 * happens client-side in LibraryScreen: an item's status is a property of
 * the item, not of which list container it happens to sit in, so a custom
 * curation's items are just as groupable as the three smart lists'.
 */
export function useLibraryItems() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['library', 'items', userId],
    queryFn: async (): Promise<LibraryItemRow[]> => {
      const { data, error } = await supabase
        .from('list_items')
        .select('*, list:lists(id, title, is_smart)')
        .order('added_at', { ascending: false });
      if (error) throw error;
      return data as unknown as LibraryItemRow[];
    },
    enabled: Boolean(userId),
  });
}

/** Manual status change (the Library's own toggle) — logging a review takes
 *  this path automatically via the log_media() RPC instead. */
export function useUpdateItemStatus() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: ItemStatus }) => {
      const { error } = await supabase
        .from('list_items')
        .update({ status, consumed_at: status === 'consumed' ? new Date().toISOString() : null })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'items', userId] });
    },
  });
}

/** "Save to My List" — the brief's alternative to "Publish to Feed" in the
 *  (+) flow. Adds to Want without creating a log/review. */
export function useAddToWantList() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (media: MediaItem) => {
      const { error } = await supabase.rpc('add_to_want_list', {
        p_media_id: media.id,
        p_media_type: media.mediaType,
        p_media_snapshot: media,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'items', userId] });
    },
  });
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  want: 'Want',
  in_progress: 'In Progress',
  consumed: 'Consumed',
};

/** want → in_progress → consumed → want. Used by the Library row's status pill. */
export function nextStatus(current: ItemStatus): ItemStatus {
  if (current === 'want') return 'in_progress';
  if (current === 'in_progress') return 'consumed';
  return 'want';
}
