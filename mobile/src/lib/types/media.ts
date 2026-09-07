/**
 * Mirrors supabase/functions/_shared/normalizeMedia.ts. Kept as a duplicate
 * rather than a shared import because the edge function runs on Deno and the
 * client on Metro/React Native — there's no monorepo package boundary set up
 * yet to share this safely (see PLAN.md Phase 0 follow-up).
 */

export type MediaType = 'FILM' | 'TV' | 'BOOK' | 'VINYL' | 'CAST' | 'EVENT';

export interface MediaItem {
  id: string;
  title: string;
  mediaType: MediaType;
  source: string;
  creator?: string;
  imageUrl?: string;
  backdropUrl?: string;
  releaseYear?: number;
  synopsis?: string;
  rating?: number;
  ratingCount?: number;
  previewUrl?: string;
  externalUrl?: string;
  genres?: string[];
  runtimeMins?: number;
}

export const MEDIA_LABEL: Record<MediaType, string> = {
  FILM: 'Film',
  TV: 'TV',
  BOOK: 'Book',
  VINYL: 'Album',
  CAST: 'Podcast',
  EVENT: 'Event',
};
