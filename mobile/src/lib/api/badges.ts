import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';

export interface EarnedBadge {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  earned_at: string;
}

export function useMyBadges() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['badges', 'mine', userId],
    queryFn: async (): Promise<EarnedBadge[]> => {
      const { data, error } = await supabase
        .from('user_badges')
        .select('earned_at, badge:badges(id, key, name, description, icon_url)')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });
      if (error) throw error;
      return (data as any[])
        .filter((row) => row.badge)
        .map((row) => ({ ...row.badge, earned_at: row.earned_at }));
    },
    enabled: Boolean(userId),
  });
}
