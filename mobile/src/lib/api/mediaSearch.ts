import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MediaItem } from '@/lib/types/media';

interface SearchPage {
  items: MediaItem[];
  failed: string[];
  page: number;
}

async function searchMedia(q: string, page: number): Promise<SearchPage> {
  const { data, error } = await supabase.functions.invoke<SearchPage>('media-search', {
    body: { q, page },
  });
  if (error) throw error;
  return data ?? { items: [], failed: [], page };
}

/** 420ms after the last keystroke, matching the prototype (ARCHITECTURE.md §4). */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Search-as-you-type against the media-search edge function.
 *
 * `failed` surfaces which providers dropped out for *this* page so a
 * component can render the quiet "Music unavailable" chip — never an empty
 * state — per ARCHITECTURE.md §3.
 */
export function useMediaSearch(rawQuery: string) {
  const query = useDebouncedValue(rawQuery.trim(), 420);
  const isQueryLongEnough = query.length >= 2;

  const result = useInfiniteQuery({
    queryKey: ['search', query],
    queryFn: ({ pageParam }) => searchMedia(query, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length > 0 ? allPages.length + 1 : undefined,
    enabled: isQueryLongEnough,
    staleTime: 5 * 60_000,
  });

  const items = useMemo(
    () => result.data?.pages.flatMap((p) => p.items) ?? [],
    [result.data]
  );
  const failedProviders = useMemo(
    () => [...new Set(result.data?.pages.flatMap((p) => p.failed) ?? [])],
    [result.data]
  );

  return { ...result, items, failedProviders, isQueryLongEnough };
}
