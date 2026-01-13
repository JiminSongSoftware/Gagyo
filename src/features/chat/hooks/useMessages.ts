/**
 * Hook for fetching messages in a conversation.
 *
 * Provides paginated messages with sender information.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MessageWithSender, MessageContentType } from '@/types/database';

const PAGE_SIZE = 50;

export interface MessagesState {
  messages: MessageWithSender[];
  loading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching messages in a conversation.
 *
 * @param conversationId - The conversation ID to fetch messages for
 * @param tenantId - The tenant ID for RLS enforcement
 * @returns MessagesState with messages list, loading, error, and pagination
 *
 * @example
 * ```tsx
 * function MessageList() {
 *   const { messages, loading, loadMore, hasMore } = useMessages(conversationId, tenantId);
 *
 *   return (
 *     <FlatList
 *       data={messages}
 *       keyExtractor={(item) => item.id}
 *       renderItem={({ item }) => <MessageBubble message={item} />}
 *       onEndReached={hasMore ? loadMore : undefined}
 *       onEndReachedThreshold={0.5}
 *       inverted
 *     />
 *   );
 * }
 * ```
 */
export function useMessages(conversationId: string | null, tenantId: string | null): MessagesState {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchMessages = useCallback(
    async (reset: boolean = false) => {
      if (!conversationId || !tenantId) {
        setMessages([]);
        setLoading(false);
        setError(null);
        return;
      }

      if (reset) {
        setOffset(0);
        setHasMore(true);
      }

      setLoading(true);
      setError(null);

      try {
        const currentOffset = reset ? 0 : offset;

        const { data, error: fetchError } = await supabase
          .from('messages')
          .select(
            `
            id,
            tenant_id,
            conversation_id,
            sender_id,
            parent_id,
            content,
            content_type,
            is_event_chat,
            created_at,
            updated_at,
            deleted_at,
            sender:memberships!messages_sender_id_fkey (
              id,
              user:users!memberships_user_id_fkey (
                id,
                display_name,
                photo_url
              )
            ),
            replies:messages!parent_id(count)
          `
          )
          .eq('conversation_id', conversationId)
          .eq('tenant_id', tenantId)
          .is('parent_id', null) // Only fetch top-level messages, not thread replies
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + PAGE_SIZE - 1);

        if (fetchError) {
          throw fetchError;
        }

        const messagesWithSender = (data || []).map((msg) => {
          const sender = msg.sender as {
            id: string;
            user: { id: string; display_name: string | null; photo_url: string | null };
          };

          // Extract reply count from the aggregate subquery
          const replies = msg.replies as { count: number }[] | undefined;
          const reply_count = replies?.[0]?.count ?? 0;

          return {
            id: msg.id,
            tenant_id: msg.tenant_id,
            conversation_id: msg.conversation_id,
            sender_id: msg.sender_id,
            parent_id: msg.parent_id,
            content: msg.content,
            content_type: msg.content_type as MessageContentType,
            is_event_chat: msg.is_event_chat,
            created_at: msg.created_at,
            updated_at: msg.updated_at,
            deleted_at: msg.deleted_at,
            // Flatten user data into sender object to match MessageWithSender type
            sender: {
              id: sender?.id ?? '',
              display_name: sender?.user?.display_name ?? null,
              photo_url: sender?.user?.photo_url ?? null,
            },
            reply_count,
          } as MessageWithSender;
        });

        // Reverse to get chronological order (oldest first)
        const sortedMessages = messagesWithSender.reverse();

        if (reset) {
          setMessages(sortedMessages);
        } else {
          // Prepend older messages (for infinite scroll going back)
          setMessages((prev) => [...sortedMessages, ...prev]);
        }

        setHasMore(data?.length === PAGE_SIZE);
        setOffset(currentOffset + (data?.length || 0));
      } catch (err) {
        setError(err as Error);
        if (reset) {
          setMessages([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [conversationId, tenantId, offset]
  );

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchMessages(false);
    }
  }, [loading, hasMore, fetchMessages]);

  const refetch = useCallback(async () => {
    await fetchMessages(true);
  }, [fetchMessages]);

  useEffect(() => {
    void fetchMessages(true);
  }, [conversationId, tenantId]);

  return {
    messages,
    loading,
    error,
    loadMore,
    hasMore,
    refetch,
  };
}

/**
 * Add a new message to the messages list.
 * Used by the real-time subscription hook.
 * @returns The new messages array with the message appended
 */
export function appendMessage(
  prev: MessageWithSender[],
  newMessage: MessageWithSender
): MessageWithSender[] {
  return [...prev, newMessage];
}

/**
 * Update a message in the messages list.
 * Used by the real-time subscription hook for message edits.
 * @returns The new messages array with the message updated
 */
export function updateMessage(
  prev: MessageWithSender[],
  updatedMessage: MessageWithSender
): MessageWithSender[] {
  return prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg));
}

/**
 * Remove a message from the messages list.
 * Used by the real-time subscription hook for message deletes.
 * @returns The new messages array with the message removed
 */
export function removeMessage(
  prev: MessageWithSender[],
  messageId: string
): MessageWithSender[] {
  return prev.filter((msg) => msg.id !== messageId);
}
