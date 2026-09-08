import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';

export type NotificationKind =
  | 'ask_answered' | 'new_follower' | 'badge_earned' | 'path_node_unlocked' | 'report_resolved';

export interface NotificationRow {
  id: string;
  user_id: string;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/**
 * "Deliberately not a notification feed of likes/counts" (0004's own
 * comment) — every row here is written server-side by a trigger, never by
 * the client, so this is read/mark-read only.
 */
export function useNotifications() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });
}
