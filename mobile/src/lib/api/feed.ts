import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';
import type { LogRow } from './logs';

export interface FriendActivityRow extends LogRow {
  author: { id: string; display_name: string | null; handle: string | null } | null;
}

const PAGE_SIZE = 20;

async function fetchFolloweeIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('follows').select('followee_id').eq('follower_id', userId);
  if (error) throw error;
  return data.map((row) => row.followee_id);
}

async function attachAuthors(logs: LogRow[]): Promise<FriendActivityRow[]> {
  const ids = [...new Set(logs.map((l) => l.user_id))];
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('profiles').select('id, display_name, handle').in('id', ids);
  if (error) throw error;
  const byId = new Map(data.map((p) => [p.id, p]));
  return logs.map((l) => ({ ...l, author: byId.get(l.user_id) ?? null }));
}

/**
 * Own logs + logs from people you follow — `visible_logs` (0014) already
 * restricts a 'friends'-tier log to the author's followers and a 'public'
 * one to everyone, but querying it directly would still surface public logs
 * from total strangers. The explicit `user_id in (...)` filter is what
 * actually makes this a *friend* feed rather than a public firehose.
 */
async function fetchFriendActivityPage(userId: string, page: number): Promise<FriendActivityRow[]> {
  const followeeIds = await fetchFolloweeIds(userId);
  const ids = [...followeeIds, userId];
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('visible_logs')
    .select('*')
    .in('user_id', ids)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return attachAuthors(data as LogRow[]);
}

/** Feed tab: "a short run of friends' logs" (Palette.dc.html:6910) — capped,
 *  not paginated. */
export function useFriendActivityFeed(limit = 20) {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['feed', 'friend-activity', 'recent', userId, limit],
    queryFn: async () => (userId ? (await fetchFriendActivityPage(userId, 0)).slice(0, limit) : []),
    enabled: Boolean(userId),
  });
}

/** Friends tab: "the full stream" — same query, paginated. */
export function useFriendActivityStream() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useInfiniteQuery({
    queryKey: ['feed', 'friend-activity', 'stream', userId],
    queryFn: ({ pageParam }) => fetchFriendActivityPage(userId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.length === PAGE_SIZE ? allPages.length : undefined),
    enabled: Boolean(userId),
  });
}
