import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';

export interface ProfileRow {
  id: string;
  display_name: string | null;
  handle: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean;
  onboarding_completed_at: string | null;
}

/**
 * The signed-in user's own profile row — separate from `useAuthStore`'s
 * `session` (device-local auth state) because RootNavigator needs a piece of
 * *server* truth to decide Onboarding vs. Main: `onboarding_completed_at`
 * has to survive a reinstall, which nothing in Zustand's in-memory store
 * does.
 */
export function useMyProfile() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['profile', 'me', userId],
    queryFn: async (): Promise<ProfileRow> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, handle, bio, avatar_url, is_private, onboarding_completed_at')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });
}

/** Called once, at the end of the FollowPeople step — flips the flag
 *  RootNavigator is watching, which swaps it into Main on its own. */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me', userId] });
    },
  });
}
