/**
 * Hook for fetching conversations with last message and unread count.
 *
 * Provides tenant-scoped conversations sorted by most recent activity.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ConversationWithLastMessage, MessageContentType } from '@/types/database';

export interface ConversationsState {
  conversations: ConversationWithLastMessage[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching user's conversations within a tenant.
 *
 * @param tenantId - The tenant ID to fetch conversations for
 * @param membershipId - The current user's membership ID for unread calculation
 * @returns ConversationsState with conversations list, loading, error, and refetch function
 *
 * @example
 * ```tsx
 * function ConversationList() {
 *   const { activeTenantId } = useTenantContext();
 *   const { conversations, loading, refetch } = useConversations(activeTenantId, membershipId);
 *
 *   if (loading) return <Spinner />;
 *
 *   return (
 *     <FlatList
 *       data={conversations}
 *       keyExtractor={(item) => item.id}
 *       renderItem={({ item }) => <ConversationListItem conversation={item} />}
 *       onRefresh={refetch}
 *       refreshing={loading}
 *     />
 *   );
 * }
 * ```
 */
export function useConversations(
  tenantId: string | null,
  membershipId: string | null
): ConversationsState {
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!tenantId || !membershipId) {
      setConversations([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, get conversations where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('membership_id', membershipId);

      if (participantError) {
        throw participantError;
      }

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participantData.map((p) => p.conversation_id);
      const lastReadMap = new Map(participantData.map((p) => [p.conversation_id, p.last_read_at]));

      // Fetch conversations with last message
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(
          `
            id,
            tenant_id,
            type,
            name,
            small_group_id,
            ministry_id,
            created_at,
            updated_at
          `
        )
        .eq('tenant_id', tenantId)
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (conversationsError) {
        throw conversationsError;
      }

      // Fetch last message and unread count for each conversation
      const conversationsWithDetails = await Promise.all(
        (conversationsData || []).map(async (conversation) => {
          // Get last message
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select(
              `
              id,
              content,
              content_type,
              created_at,
              sender:memberships!messages_sender_id_fkey (
                id,
                user:users!memberships_user_id_fkey (
                  id,
                  display_name
                )
              )
            `
            )
            .eq('conversation_id', conversation.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const lastReadAt = lastReadMap.get(conversation.id);
          let unreadCount = 0;

          if (lastReadAt) {
            const { count } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conversation.id)
              .is('deleted_at', null)
              .gt('created_at', lastReadAt);

            unreadCount = count ?? 0;
          } else {
            // If never read, all messages are unread
            const { count } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conversation.id)
              .is('deleted_at', null);

            unreadCount = count ?? 0;
          }

          // Get participant names for direct messages
          let participantNames: string[] | undefined;
          if (conversation.type === 'direct') {
            const { data: participants } = await supabase
              .from('conversation_participants')
              .select(
                `
                membership:memberships!conversation_participants_membership_id_fkey (
                  user:users!memberships_user_id_fkey (
                    display_name
                  )
                )
              `
              )
              .eq('conversation_id', conversation.id)
              .neq('membership_id', membershipId);

            participantNames = participants
              ?.map(
                (p) =>
                  (p.membership as { user: { display_name: string | null } })?.user?.display_name
              )
              .filter((name): name is string => name !== null);
          }

          const lastMessage = lastMessageData
            ? {
                id: lastMessageData.id,
                content: lastMessageData.content,
                content_type: lastMessageData.content_type as MessageContentType,
                created_at: lastMessageData.created_at,
                sender: {
                  id: (lastMessageData.sender as { id: string })?.id ?? '',
                  user: {
                    id:
                      (
                        lastMessageData.sender as {
                          user: { id: string; display_name: string | null };
                        }
                      )?.user?.id ?? '',
                    display_name:
                      (
                        lastMessageData.sender as {
                          user: { id: string; display_name: string | null };
                        }
                      )?.user?.display_name ?? null,
                  },
                },
              }
            : null;

          return {
            ...conversation,
            last_message: lastMessage,
            unread_count: unreadCount,
            participant_names: participantNames,
          } as ConversationWithLastMessage;
        })
      );

      setConversations(conversationsWithDetails);
    } catch (err) {
      setError(err as Error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, membershipId]);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
  };
}
