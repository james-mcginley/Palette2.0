import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';
import type { MediaItem, MediaType } from '@/lib/types/media';

export type CurationVisibility = 'public' | 'friends' | 'private';

export interface MyCurationRow {
  id: string;
  title: string;
  description: string | null;
  visibility: CurationVisibility;
  itemCount: number;
}

export interface CurationItemDraft {
  id: string;
  media_id: string;
  media_type: MediaType;
  media_snapshot: MediaItem;
  position: number;
}

/**
 * The asker's own curations, any visibility, with an item count — this is
 * what makes Discover's editorial grid and CurationDetailScreen anything
 * other than "no collections yet": before this there was no way for a user
 * to create the content those screens render.
 */
export function useMyCurations() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['curations', 'mine', userId],
    queryFn: async (): Promise<MyCurationRow[]> => {
      const { data, error } = await supabase
        .from('curations')
        .select('id, title, description, visibility, curation_items(count)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        visibility: row.visibility,
        itemCount: row.curation_items?.[0]?.count ?? 0,
      }));
    },
    enabled: Boolean(userId),
  });
}

export interface MyCurationDetail {
  id: string;
  title: string;
  description: string | null;
  visibility: CurationVisibility;
}

/** Owner-scoped fetch for the builder's edit mode — the "users manage their
 *  own curations" policy already covers SELECT on your own row. */
export function useCuration(curationId: string | undefined) {
  return useQuery({
    queryKey: ['curations', 'one', curationId],
    queryFn: async (): Promise<MyCurationDetail> => {
      const { data, error } = await supabase
        .from('curations')
        .select('id, title, description, visibility')
        .eq('id', curationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(curationId),
  });
}

export function useCurationItems(curationId: string | undefined) {
  return useQuery({
    queryKey: ['curations', 'items', curationId],
    queryFn: async (): Promise<CurationItemDraft[]> => {
      const { data, error } = await supabase
        .from('curation_items')
        .select('id, media_id, media_type, media_snapshot, position')
        .eq('curation_id', curationId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(curationId),
  });
}

export function useCreateCuration() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (input: { title: string; description?: string; visibility: CurationVisibility }) => {
      const { data, error } = await supabase
        .from('curations')
        .insert({
          user_id: userId,
          title: input.title,
          description: input.description || null,
          visibility: input.visibility,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curations', 'mine', userId] });
    },
  });
}

export function useUpdateCuration(curationId: string) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (input: { title: string; description?: string; visibility: CurationVisibility }) => {
      const { error } = await supabase
        .from('curations')
        .update({
          title: input.title,
          description: input.description || null,
          visibility: input.visibility,
        })
        .eq('id', curationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curations', 'mine', userId] });
      queryClient.invalidateQueries({ queryKey: ['curation-detail', curationId] });
    },
  });
}

/** `unique (curation_id, media_id)` on the table means re-adding the same
 *  item is a no-op worth swallowing, not an error to surface. */
export function useAddCurationItem(curationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (media: MediaItem) => {
      const { count } = await supabase
        .from('curation_items')
        .select('id', { count: 'exact', head: true })
        .eq('curation_id', curationId);

      const { error } = await supabase.from('curation_items').insert({
        curation_id: curationId,
        media_id: media.id,
        media_type: media.mediaType,
        media_snapshot: media,
        position: count ?? 0,
      });
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curations', 'items', curationId] });
      queryClient.invalidateQueries({ queryKey: ['curations', 'mine'] });
    },
  });
}

export function useRemoveCurationItem(curationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('curation_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curations', 'items', curationId] });
      queryClient.invalidateQueries({ queryKey: ['curations', 'mine'] });
    },
  });
}

export function useDeleteCuration() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (curationId: string) => {
      const { error } = await supabase.from('curations').delete().eq('id', curationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curations', 'mine', userId] });
    },
  });
}
