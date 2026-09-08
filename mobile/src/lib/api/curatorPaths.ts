import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';
import type { MediaItem, MediaType } from '@/lib/types/media';

export interface CuratorPathSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  curator_name: string;
  cover_image_url: string | null;
}

export interface CuratorPathNode {
  id: string;
  path_id: string;
  position: number;
  title: string;
  media_refs: { media_id: string; media_type: MediaType; snapshot: MediaItem }[];
}

export interface UserPathProgress {
  current_node_position: number;
  completed_at: string | null;
}

export interface CuratorPathDetail {
  path: CuratorPathSummary;
  nodes: CuratorPathNode[];
  progress: UserPathProgress | null;
  badgeName: string | null;
}

/** Every published path — there's no "Paths" tab, so this backs a browse
 *  screen reached the same way Asks is: a button on Discover's search bar,
 *  mirroring the design's own Discover-filter placement for both. */
export function usePublishedCuratorPaths() {
  return useQuery({
    queryKey: ['curator-paths', 'published'],
    queryFn: async (): Promise<CuratorPathSummary[]> => {
      const { data, error } = await supabase
        .from('curator_paths')
        .select('id, slug, title, description, curator_name, cover_image_url')
        .eq('published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCuratorPath(pathId: string) {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['curator-paths', 'detail', pathId, userId],
    queryFn: async (): Promise<CuratorPathDetail> => {
      const [{ data: path, error: pathError }, { data: nodes, error: nodesError }, { data: progress }, { data: badge }] =
        await Promise.all([
          supabase.from('curator_paths').select('id, slug, title, description, curator_name, cover_image_url').eq('id', pathId).single(),
          supabase.from('curator_path_nodes').select('id, path_id, position, title, media_refs').eq('path_id', pathId).order('position'),
          userId
            ? supabase.from('user_path_progress').select('current_node_position, completed_at').eq('user_id', userId).eq('path_id', pathId).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from('badges').select('name').eq('path_id', pathId).maybeSingle(),
        ]);
      if (pathError || !path) throw pathError ?? new Error('curator path not found');
      if (nodesError) throw nodesError;

      return { path, nodes: nodes ?? [], progress, badgeName: badge?.name ?? null };
    },
    enabled: Boolean(pathId),
  });
}

export function useStartCuratorPath(pathId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('start_curator_path', { p_path_id: pathId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curator-paths', 'detail', pathId] });
    },
  });
}

/** Only the node matching the caller's current position can advance — the
 *  RPC enforces that server-side, so this is a thin wrapper, not a place to
 *  re-derive "is this the current node" client-side and risk drifting from
 *  what the server actually allows. */
export function useAdvanceCuratorPathNode(pathId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nodePosition: number) => {
      const { data, error } = await supabase
        .rpc('advance_curator_path_node', { p_path_id: pathId, p_node_position: nodePosition })
        .single();
      if (error) throw error;
      return data as { current_node_position: number; completed: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curator-paths', 'detail', pathId] });
    },
  });
}
