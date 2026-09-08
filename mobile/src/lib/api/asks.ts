import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';
import type { MediaType } from '@/lib/types/media';

export type AskStatus = 'open' | 'answered' | 'closed';

export interface AskRow {
  id: string;
  user_id: string;
  question: string;
  media_type: MediaType | null;
  status: AskStatus;
  created_at: string;
  author: { display_name: string | null; handle: string | null } | null;
}

export interface AskAnswerRow {
  id: string;
  ask_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: { display_name: string | null; handle: string | null } | null;
}

async function attachAuthors<T extends { user_id: string }>(
  rows: T[]
): Promise<(T & { author: { display_name: string | null; handle: string | null } | null })[]> {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  if (ids.length === 0) return rows.map((r) => ({ ...r, author: null }));
  const { data, error } = await supabase.from('profiles').select('id, display_name, handle').in('id', ids);
  if (error) throw error;
  const byId = new Map(data.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, author: byId.get(r.user_id) ?? null }));
}

/** Others' open asks — the "help someone out" feed. Excludes the viewer's
 *  own, which live in `useMyAsks` instead. */
export function useOpenAsks() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['asks', 'open', userId],
    queryFn: async (): Promise<AskRow[]> => {
      const { data, error } = await supabase
        .from('visible_asks')
        .select('id, user_id, question, media_type, status, created_at')
        .eq('status', 'open')
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return attachAuthors(data);
    },
    enabled: Boolean(userId),
  });
}

/** The asker's own asks, any status — so they can see whether theirs got answered. */
export function useMyAsks() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['asks', 'mine', userId],
    queryFn: async (): Promise<AskRow[]> => {
      const { data, error } = await supabase
        .from('asks')
        .select('id, user_id, question, media_type, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return attachAuthors(data);
    },
    enabled: Boolean(userId),
  });
}

export function useAsk(askId: string) {
  return useQuery({
    queryKey: ['asks', 'one', askId],
    queryFn: async (): Promise<AskRow> => {
      const { data, error } = await supabase
        .from('visible_asks')
        .select('id, user_id, question, media_type, status, created_at')
        .eq('id', askId)
        .single();
      if (error) throw error;
      const [withAuthor] = await attachAuthors([data]);
      return withAuthor;
    },
    enabled: Boolean(askId),
  });
}

export function useAskAnswers(askId: string) {
  return useQuery({
    queryKey: ['asks', 'answers', askId],
    queryFn: async (): Promise<AskAnswerRow[]> => {
      const { data, error } = await supabase
        .from('visible_ask_answers')
        .select('id, ask_id, user_id, body, created_at')
        .eq('ask_id', askId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return attachAuthors(data);
    },
    enabled: Boolean(askId),
  });
}

export function useCreateAsk() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (input: { question: string; mediaType?: MediaType | null }) => {
      const { error } = await supabase.from('asks').insert({
        user_id: userId,
        question: input.question,
        media_type: input.mediaType ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asks', 'mine', userId] });
    },
  });
}

/**
 * `ask_answers`'s own insert policy requires the ask to still be 'open'
 * (0004_asks_and_mailbox.sql) — the first answer flips it to 'answered' via
 * `notify_ask_answered`, which as a side effect closes an ask to further
 * answers. The UI mirrors that rather than fighting it: AskDetailScreen only
 * shows the composer while `status === 'open'`.
 */
export function useCreateAnswer(askId: string) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from('ask_answers').insert({ ask_id: askId, user_id: userId, body });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asks', 'answers', askId] });
      queryClient.invalidateQueries({ queryKey: ['asks', 'one', askId] });
      queryClient.invalidateQueries({ queryKey: ['asks', 'open', userId] });
    },
  });
}
