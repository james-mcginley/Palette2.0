import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';

export interface ProfileSummary {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
}

/** Matches useMediaSearch's debounce (mediaSearch.ts) — kept as its own
 *  small copy rather than a shared util, same call as normalizeMedia's
 *  client/edge duplication: two unrelated call sites, not worth a shared
 *  module for four lines. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Search-as-you-type over public profiles, excluding the signed-in user.
 * An empty query returns recently-joined people instead of nothing — this
 * is what onboarding's FollowPeopleScreen shows before anyone's typed
 * anything, and it's a plain "who's here" listing, not a claim of curated
 * suggestions (there's no basis yet — everyone's equally new).
 */
export function useSearchProfiles(rawQuery: string) {
  const query = useDebouncedValue(rawQuery.trim(), 300);
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['profiles', 'search', query, userId],
    queryFn: async (): Promise<ProfileSummary[]> => {
      let builder = supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url')
        .neq('id', userId)
        .limit(30);

      builder = query.length > 0
        ? builder.or(`display_name.ilike.%${query}%,handle.ilike.%${query}%`)
        : builder.order('created_at', { ascending: false });

      const { data, error } = await builder;
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });
}

/** The signed-in user's own follow list, as a Set for O(1) "am I following
 *  this person" lookups while rendering a search/suggestion list. */
export function useFollowingIds() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['follows', 'following', userId],
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', userId);
      if (error) throw error;
      return new Set(data.map((row) => row.followee_id));
    },
    enabled: Boolean(userId),
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (followeeId: string) => {
      const { error } = await supabase.from('follows').insert({ follower_id: userId, followee_id: followeeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows', 'following', userId] });
      queryClient.invalidateQueries({ queryKey: ['feed', 'friend-activity'] });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (followeeId: string) => {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('followee_id', followeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows', 'following', userId] });
      queryClient.invalidateQueries({ queryKey: ['feed', 'friend-activity'] });
    },
  });
}
