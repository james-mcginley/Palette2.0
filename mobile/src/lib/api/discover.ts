import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { MediaItem, MediaType } from '@/lib/types/media';
import { buildDiscoverGrid, type CurationWithItems, type DiscoverTile } from '@/lib/discoverGrid';

interface CurationRow {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

interface CurationItemRowRaw {
  id: string;
  curation_id: string;
  media_id: string;
  media_type: MediaType;
  media_snapshot: MediaItem;
  position: number;
}

/**
 * Discover's default (no search query) content: real public curations,
 * arranged into the editorial grid. Two queries rather than one embedded
 * select — `visible_curation_items` is a view, and PostgREST's resource
 * embedding needs a foreign-key relationship it can introspect, which a view
 * over a view doesn't reliably expose.
 */
async function fetchDiscoverFeed(): Promise<DiscoverTile[]> {
  const { data: curations, error: curationsError } = await supabase
    .from('visible_curations')
    .select('id, title, description, created_at')
    .order('created_at', { ascending: false })
    .limit(24)
    .returns<CurationRow[]>();
  if (curationsError) throw curationsError;
  if (!curations || curations.length === 0) return [];

  const { data: items, error: itemsError } = await supabase
    .from('visible_curation_items')
    .select('id, curation_id, media_id, media_type, media_snapshot, position')
    .in('curation_id', curations.map((c) => c.id))
    .order('position', { ascending: true })
    .returns<CurationItemRowRaw[]>();
  if (itemsError) throw itemsError;

  const itemsByCuration = new Map<string, CurationItemRowRaw[]>();
  for (const item of items ?? []) {
    const bucket = itemsByCuration.get(item.curation_id) ?? [];
    bucket.push(item);
    itemsByCuration.set(item.curation_id, bucket);
  }

  const withItems: CurationWithItems[] = curations.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    items: (itemsByCuration.get(c.id) ?? []).map((row) => ({
      id: row.id,
      curationId: row.curation_id,
      mediaId: row.media_id,
      mediaType: row.media_type,
      mediaSnapshot: row.media_snapshot,
      position: row.position,
    })),
  }));

  return buildDiscoverGrid(withItems);
}

export function useDiscoverFeed() {
  return useQuery({
    queryKey: ['discover-feed'],
    queryFn: fetchDiscoverFeed,
    staleTime: 5 * 60_000,
  });
}

export interface CurationDetail {
  id: string;
  title: string;
  description: string | null;
  items: CurationItemRowRaw[];
}

async function fetchCurationDetail(curationId: string): Promise<CurationDetail> {
  const { data: curation, error: curationError } = await supabase
    .from('visible_curations')
    .select('id, title, description')
    .eq('id', curationId)
    .single();
  if (curationError) throw curationError;

  const { data: items, error: itemsError } = await supabase
    .from('visible_curation_items')
    .select('id, curation_id, media_id, media_type, media_snapshot, position')
    .eq('curation_id', curationId)
    .order('position', { ascending: true })
    .returns<CurationItemRowRaw[]>();
  if (itemsError) throw itemsError;

  return { ...curation, items: items ?? [] };
}

/** Backs CurationDetailScreen — the destination for tapping a Collection or
 *  Ranked tile's background rather than one of its individual covers. */
export function useCurationDetail(curationId: string) {
  return useQuery({
    queryKey: ['curation-detail', curationId],
    queryFn: () => fetchCurationDetail(curationId),
    enabled: Boolean(curationId),
    staleTime: 5 * 60_000,
  });
}
