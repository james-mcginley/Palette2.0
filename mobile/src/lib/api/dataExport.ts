import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';

/**
 * COMPLIANCE.md's data-portability item: everything below is a table where
 * RLS already grants the caller full access to their own rows — this is
 * "read what I'm already allowed to read and package it," not a privileged
 * operation, so unlike delete-account there's no edge function or service
 * role involved. `Promise.allSettled` rather than `all`: one table having an
 * issue shouldn't produce zero output when the other nine are fine.
 */
async function fetchAllOwnData(userId: string) {
  const tables = [
    ['profile', supabase.from('profiles').select('*').eq('id', userId).maybeSingle()],
    ['logs', supabase.from('logs').select('*').eq('user_id', userId)],
    ['lists', supabase.from('lists').select('*').eq('user_id', userId)],
    ['curations', supabase.from('curations').select('*').eq('user_id', userId)],
    ['curationItems', supabase.from('curation_items').select('*, curations!inner(user_id)').eq('curations.user_id', userId)],
    ['following', supabase.from('follows').select('followee_id, created_at').eq('follower_id', userId)],
    ['followers', supabase.from('follows').select('follower_id, created_at').eq('followee_id', userId)],
    ['asks', supabase.from('asks').select('*').eq('user_id', userId)],
    ['askAnswers', supabase.from('ask_answers').select('*').eq('user_id', userId)],
    ['pathProgress', supabase.from('user_path_progress').select('*').eq('user_id', userId)],
    ['badges', supabase.from('user_badges').select('earned_at, badge:badges(key, name)').eq('user_id', userId)],
  ] as const;

  const results = await Promise.allSettled(tables.map(([, query]) => query));
  const out: Record<string, unknown> = {};
  results.forEach((result, i) => {
    const [key] = tables[i];
    out[key] = result.status === 'fulfilled' ? result.value.data : { error: 'failed to export' };
  });
  return out;
}

export function useExportData() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('not signed in');
      const data = await fetchAllOwnData(userId);
      const payload = { exportedAt: new Date().toISOString(), ...data };
      const json = JSON.stringify(payload, null, 2);

      const fileUri = `${FileSystem.documentDirectory}palette-export-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Your Palette data' });
      }
      return fileUri;
    },
  });
}
