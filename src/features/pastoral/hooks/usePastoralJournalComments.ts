/**
 * Hook for fetching pastoral journal comments with author information.
 *
 * Provides tenant-scoped comments with real-time subscriptions for live updates.
 * Only zone leaders and pastors can add comments (enforced by RLS).
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { RealtimeChannel } from '@supabase/supabase-js';

type PastoralJournalComment = Database['public']['Tables']['pastoral_journal_comments']['Row'];
type Membership = Database['public']['Tables']['memberships']['Row'];

export interface PastoralJournalCommentWithAuthor extends PastoralJournalComment {
  author: {
    id: string;
    user: {
      id: string;
      display_name: string | null;
      photo_url: string | null;
    } | null;
  } | null;
}

export interface PastoralJournalCommentsState {
  comments: PastoralJournalCommentWithAuthor[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const MAX_COMMENT_LENGTH = 1000;

/**
 * Hook for fetching comments for a pastoral journal.
 *
 * Comments can only be viewed by users with access to the journal,
 * and only zone leaders and pastors can add comments (enforced by RLS).
 *
 * @param journalId - The pastoral journal ID to fetch comments for
 * @param tenantId - The tenant ID for RLS
 * @param enableRealtime - Enable real-time subscriptions for live updates (default: true)
 * @returns PastoralJournalCommentsState with comments list, loading, error, and refetch
 *
 * @example
 * ```tsx
 * function PastoralJournalComments({ journalId }: { journalId: string }) {
 *   const { activeTenantId } = useTenantContext();
 *   const { comments, loading } = usePastoralJournalComments(
 *     journalId,
 *     activeTenantId
 *   );
 *
 *   return (
 *     <FlatList
 *       data={comments}
 *       keyExtractor={(item) => item.id}
 *       renderItem={({ item }) => <CommentItem comment={item} />}
 *       ListEmptyComponent={<Text>No comments yet</Text>}
 *     />
 *   );
 * }
 * ```
 */
export function usePastoralJournalComments(
  journalId: string | null,
  tenantId: string | null,
  enableRealtime: boolean = true
): PastoralJournalCommentsState {
  const [comments, setComments] = useState<PastoralJournalCommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchComments = useCallback(async () => {
    if (!journalId || !tenantId) {
      setComments([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('pastoral_journal_comments')
        .select(
          `
            id,
            tenant_id,
            pastoral_journal_id,
            author_id,
            content,
            created_at,
            author:author_id (
              id,
              user:users!memberships_user_id_fkey (
                id,
                display_name,
                photo_url
              )
            )
          `
        )
        .eq('pastoral_journal_id', journalId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const transformedData =
        data?.map((item) => ({
          id: item.id,
          tenant_id: item.tenant_id,
          pastoral_journal_id: item.pastoral_journal_id,
          author_id: item.author_id,
          content: item.content,
          created_at: item.created_at,
          author: item.author
            ? {
                id: item.author.id,
                user: {
                  id: item.author.user?.id ?? '',
                  display_name: item.author.user?.display_name ?? null,
                  photo_url: item.author.user?.photo_url ?? null,
                },
              }
            : null,
        })) ?? [];

      setComments(transformedData);
    } catch (err) {
      setError(err as Error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [journalId, tenantId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!journalId || !tenantId || !enableRealtime) {
      return;
    }

    let channel: RealtimeChannel | null = null;

    const setupSubscription = () => {
      channel = supabase
        .channel(`pastoral_journal_comments:${journalId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pastoral_journal_comments',
            filter: `pastoral_journal_id=eq.${journalId}`,
          },
          () => {
            // Refetch comments when any change occurs
            void fetchComments();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('Real-time subscription error for pastoral journal comments');
          }
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [journalId, tenantId, enableRealtime, fetchComments]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    error,
    refetch: fetchComments,
  };
}

/**
 * Hook for adding a comment to a pastoral journal.
 *
 * Only zone leaders and pastors can add comments (enforced by RLS).
 *
 * @param tenantId - The tenant ID for the comment
 * @param journalId - The pastoral journal ID
 * @param authorMembershipId - The author's membership ID
 * @param authorMembership - The author's membership with role info
 * @returns Object with addComment function, adding state, and error
 *
 * @example
 * ```tsx
 * function CommentForm({ journalId }: { journalId: string }) {
 *   const { activeTenantId, membershipId, membership } = useTenantContext();
 *   const { addComment, adding, error } = useAddPastoralJournalComment(
 *     activeTenantId,
 *     journalId,
 *     membershipId,
 *     membership
 *   );
 *
 *   const handleSubmit = async () => {
 *     await addComment('Great job on the outreach this week!');
 *   };
 *
 *   return (
 *     <View>
 *       <TextInput value={content} onChangeText={setContent} />
 *       <Button onPress={handleSubmit} disabled={adding}>
 *         Add Comment
 *       </Button>
 *       {error && <Text>{error.message}</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export interface UseAddPastoralJournalCommentState {
  addComment: (content: string) => Promise<string | null>;
  adding: boolean;
  error: Error | null;
}

export function useAddPastoralJournalComment(
  tenantId: string | null,
  journalId: string | null,
  authorMembershipId: string | null,
  authorMembership: Membership | null
): UseAddPastoralJournalCommentState {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addComment = useCallback(
    async (content: string): Promise<string | null> => {
      if (!tenantId || !journalId || !authorMembershipId) {
        setError(new Error('Missing required parameters'));
        return null;
      }

      // Validation
      if (!content.trim()) {
        setError(new Error('Comment cannot be empty'));
        return null;
      }

      if (content.length > MAX_COMMENT_LENGTH) {
        setError(new Error(`Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`));
        return null;
      }

      // Client-side role validation (RLS will enforce server-side)
      const role = authorMembership?.role;
      const allowedRoles = ['zone_leader', 'pastor', 'admin'];

      if (!role || !allowedRoles.includes(role)) {
        setError(
          new Error('Only zone leaders, pastors, and admins can add comments to pastoral journals')
        );
        return null;
      }

      setAdding(true);
      setError(null);

      try {
        const { data, error: insertError } = await supabase
          .from('pastoral_journal_comments')
          .insert({
            tenant_id: tenantId,
            pastoral_journal_id: journalId,
            author_id: authorMembershipId,
            content: content.trim(),
          })
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }

        if (!data) {
          throw new Error('Failed to add comment');
        }

        return data.id;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setAdding(false);
      }
    },
    [tenantId, journalId, authorMembershipId, authorMembership]
  );

  return {
    addComment,
    adding,
    error,
  };
}

/**
 * Hook for checking if a user can add comments to a pastoral journal.
 *
 * @param membership - The current user's membership
 * @returns Whether the user can add comments
 *
 * @example
 * ```tsx
 * function CommentSection({ journalId }: { journalId: string }) {
 *   const { membership } = useTenantContext();
 *   const canComment = useCanAddComment(membership);
 *
 *   if (!canComment) {
 *     return <Text>Only zone leaders and pastors can add comments</Text>;
 *   }
 *
 *   return <CommentForm journalId={journalId} />;
 * }
 * ```
 */
export function useCanAddComment(membership: Membership | null): boolean {
  if (!membership) {
    return false;
  }

  const allowedRoles = ['zone_leader', 'pastor', 'admin'];
  return allowedRoles.includes(membership.role);
}
