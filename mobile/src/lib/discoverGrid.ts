import type { MediaItem, MediaType } from '@/lib/types/media';

/**
 * Turns real curations (`curations` + `curation_items`, via the
 * `visible_curations`/`visible_curation_items` views) into the tile taxonomy
 * from EDITORIAL_SYSTEM.md §1. Deliberately never fabricates editorial
 * content — the same principle the Logbook section states outright ("never
 * generate a fake handwritten note"): every tile here traces back to a real
 * curation a real user built. An empty result is a genuine empty state, not
 * something to paper over with invented picks.
 */

export interface CurationItemRow {
  id: string;
  curationId: string;
  mediaId: string;
  mediaType: MediaType;
  mediaSnapshot: MediaItem;
  position: number;
}

export interface CurationWithItems {
  id: string;
  title: string;
  description: string | null;
  items: CurationItemRow[];
}

export type DiscoverTile =
  | {
      kind: 'feature';
      key: string;
      curationId: string;
      title: string;
      subtitle: string | null;
      meta: string;
      imageUrl?: string;
    }
  | {
      kind: 'collection';
      key: string;
      curationId: string;
      title: string;
      items: { id: string; mediaId: string; mediaType: MediaType; imageUrl?: string; rotationDeg: number }[];
    }
  | {
      kind: 'ranked';
      key: string;
      curationId: string;
      title: string;
      count: number;
      imageUrl?: string;
    }
  | {
      kind: 'standard';
      key: string;
      curationId: string;
      mediaId: string;
      title: string;
      creator?: string;
      mediaType: MediaType;
      imageUrl?: string;
    };

/** Stable per-slot rotation base from the spec, ±2° jitter derived from the
 *  item id so it's fixed across renders (EDITORIAL_SYSTEM.md §1: "derived
 *  from the item id, not random per render") without every fanned set
 *  looking identically tilted. */
const SLOT_BASE_ROTATION = [-4, 2, -2];

function hashString(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash;
}

function rotationForSlot(id: string, slot: number): number {
  const base = SLOT_BASE_ROTATION[slot % SLOT_BASE_ROTATION.length];
  const jitter = (hashString(id) % 5) - 2; // -2..2
  return base + jitter;
}

const MEDIA_COUNT_LABEL: Record<MediaType, [string, string]> = {
  FILM: ['film', 'films'],
  TV: ['show', 'shows'],
  BOOK: ['book', 'books'],
  VINYL: ['album', 'albums'],
  CAST: ['podcast', 'podcasts'],
  EVENT: ['event', 'events'],
};

function describeCounts(items: CurationItemRow[]): string {
  const counts = new Map<MediaType, number>();
  for (const item of items) counts.set(item.mediaType, (counts.get(item.mediaType) ?? 0) + 1);
  return [...counts.entries()]
    .map(([type, n]) => `${n} ${MEDIA_COUNT_LABEL[type][n === 1 ? 0 : 1]}`)
    .join(' · ');
}

/**
 * Classifies each curation into one tile, then arranges the result so no
 * tile type repeats more than twice in a row (EDITORIAL_SYSTEM.md §1's grid
 * rhythm rule) — a lightweight, deterministic pass, not a search over
 * permutations, since a handful of curations never has enough variety to
 * need one.
 */
export function buildDiscoverGrid(curations: CurationWithItems[]): DiscoverTile[] {
  const withItems = curations.filter((c) => c.items.length > 0);
  if (withItems.length === 0) return [];

  const featureSource = withItems.find((c) => c.description && c.items[0]?.mediaSnapshot.imageUrl);

  const rest: DiscoverTile[] = [];
  for (const c of withItems) {
    if (c.id === featureSource?.id) continue;

    if (c.items.length === 1) {
      const only = c.items[0];
      rest.push({
        kind: 'standard',
        key: `standard:${c.id}`,
        curationId: c.id,
        mediaId: only.mediaId,
        title: only.mediaSnapshot.title,
        creator: only.mediaSnapshot.creator,
        mediaType: only.mediaType,
        imageUrl: only.mediaSnapshot.imageUrl,
      });
      continue;
    }

    if (c.items.length >= 6) {
      rest.push({
        kind: 'ranked',
        key: `ranked:${c.id}`,
        curationId: c.id,
        title: c.title,
        count: c.items.length,
        imageUrl: c.items[0].mediaSnapshot.imageUrl,
      });
      continue;
    }

    rest.push({
      kind: 'collection',
      key: `collection:${c.id}`,
      curationId: c.id,
      title: c.title,
      items: c.items.slice(0, 3).map((item, slot) => ({
        id: item.id,
        mediaId: item.mediaId,
        mediaType: item.mediaType,
        imageUrl: item.mediaSnapshot.imageUrl,
        rotationDeg: rotationForSlot(item.id, slot),
      })),
    });
  }

  const feature: DiscoverTile | null = featureSource
    ? {
        kind: 'feature',
        key: `feature:${featureSource.id}`,
        curationId: featureSource.id,
        title: featureSource.title,
        subtitle: featureSource.description,
        meta: describeCounts(featureSource.items),
        imageUrl: featureSource.items[0]?.mediaSnapshot.imageUrl,
      }
    : null;

  const arranged = breakUpRepeats(rest);
  return feature ? [feature, ...arranged] : arranged;
}

/** Greedily reorders so the same `kind` never appears three times running. */
function breakUpRepeats(tiles: DiscoverTile[]): DiscoverTile[] {
  const pool = [...tiles];
  const out: DiscoverTile[] = [];

  while (pool.length) {
    const lastTwo = out.slice(-2);
    const mustAvoid = lastTwo.length === 2 && lastTwo[0].kind === lastTwo[1].kind ? lastTwo[0].kind : null;
    let idx = pool.findIndex((t) => t.kind !== mustAvoid);
    if (idx === -1) idx = 0;
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}
