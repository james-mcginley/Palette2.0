import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';

export type ContentKind = 'log' | 'curation' | 'ask' | 'ask_answer' | 'profile';
export type ReportReason =
  | 'spam' | 'harassment' | 'hate' | 'sexual' | 'violence' | 'copyright' | 'misinformation' | 'other';

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  spam: 'Spam',
  harassment: 'Harassment or bullying',
  hate: 'Hate speech',
  sexual: 'Sexual content',
  violence: 'Violence',
  copyright: 'Copyright infringement',
  misinformation: 'Misinformation',
  other: 'Something else',
};

export interface ReportInput {
  contentKind: ContentKind;
  contentId: string;
  authorId: string;
  reason: ReportReason;
  detail?: string;
}

/**
 * COMPLIANCE.md §1 (Apple guideline 1.2): report, block, filter and a
 * stated response commitment are all required for an app with public UGC.
 * This is the report half — insertion alone is enough to do its job, since
 * `trg_auto_hide` (0005_moderation.sql) hides content once three distinct
 * reporters have filed against it; there is no separate "submit for review"
 * step to wire up.
 */
export function useReportContent() {
  return useMutation({
    mutationFn: async (input: ReportInput) => {
      const { error } = await supabase.from('reports').insert({
        content_kind: input.contentKind,
        content_id: input.contentId,
        author_id: input.authorId,
        reason: input.reason,
        detail: input.detail || null,
      });
      // A duplicate (reporter, content) report is a unique-constraint
      // violation, not a failure worth surfacing — re-reporting the same
      // item isn't additional signal, and the user already got their
      // "thanks, we'll review it" confirmation the first time.
      if (error && error.code !== '23505') throw error;
    },
  });
}

export interface BlockedProfile {
  blocked_id: string;
  created_at: string;
  profile: { id: string; display_name: string | null; handle: string | null } | null;
}

/** Settings → Privacy's blocked list. Apple checks that a block can be
 *  undone from here. */
export function useMyBlockedProfiles() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['blocks', 'mine', userId],
    queryFn: async (): Promise<BlockedProfile[]> => {
      const { data: blocks, error } = await supabase
        .from('blocks')
        .select('blocked_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (blocks.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, handle')
        .in('id', blocks.map((b) => b.blocked_id));
      if (profilesError) throw profilesError;

      const byId = new Map(profiles.map((p) => [p.id, p]));
      return blocks.map((b) => ({ ...b, profile: byId.get(b.blocked_id) ?? null }));
    },
    enabled: Boolean(userId),
  });
}

/**
 * Blocking is symmetric everywhere it's read back (every `visible_*` view
 * filters both directions — 0005_moderation.sql), so one insert is enough
 * to remove their content from both sides. The broad invalidation here is
 * what makes that show up immediately rather than on the next natural
 * refetch: block/unblock is rare enough that "recompute everything" costs
 * nothing a user would notice.
 */
export function useBlockUser() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase.from('blocks').insert({ blocker_id: userId, blocked_id: blockedId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', userId)
        .eq('blocked_id', blockedId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
