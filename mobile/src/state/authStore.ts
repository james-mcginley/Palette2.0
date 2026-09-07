import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

/**
 * Auth session is genuinely local, device-right-now state — it's what
 * Zustand is for (ARCHITECTURE.md §1). Server data derived from the session
 * (profile row, logs, lists) belongs in React Query, keyed off session.user.id.
 */
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  setSession: (session) => set({ session, isLoading: false }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));

/** Call once at app start; keeps the store in sync with Supabase's own auth events. */
export function subscribeToAuthChanges(): () => void {
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.getState().setSession(data.session);
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });

  return () => listener.subscription.unsubscribe();
}
