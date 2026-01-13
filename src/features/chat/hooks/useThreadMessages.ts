/**
 * Hook for fetching thread messages (replies to a parent message).
 *
 * Provides paginated messages for a specific thread.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MessageWithSender, MessageContentType } from '@/types/database';

const PAGE_SIZE = 50;

export interface ThreadMessagesState {
  messages: MessageWithSender[];
  parentMessage: MessageWithSender | null;
  loading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching messages in a thread.
 *
 * @param parentMessageId - The parent message ID to fetch thread replies for
 * @param tenantId - The tenant ID for RLS enforcement
 * @returns ThreadMessagesState with messages list, loading, error, and pagination
 *
 * @example
 * ```tsx
 * function ThreadView({ parentMessageId }: { parentMessageId: string }) {
 *   const { messages, parentMessage, loading, loadMore, hasMore } = useThreadMessages(
 *     parentMessageId,
 *     tenantId
 *   );
 *
 *   return (
 *     <FlatList
 *       data={messages}
 *       keyExtractor={(item) => item.id}
 *       renderItem={({ item }) => <MessageBubble message={item} />}
 *       onEndReached={hasMore ? loadMore : undefined}
 *       ListHeaderComponent={parentMessage && <MessageBubble message={parentMessage} />}
 *     />
 *   );
 * }
 * ```
 */
export function useThreadMessages(
  parentMessageId: string | null,
  tenantId: string | null
): ThreadMessagesState {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [parentMessage, setParentMessage] = useState<MessageWithSender | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Fetch parent message
  const fetchParentMessage = useCallback(async () => {
    if (!parentMessageId || !tenantId) {
      setParentMessage(null);
      return;
    }

    try {
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
          )
        `
        )
        .eq('id', parentMessageId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        const sender = data.sender as {
          id: string;
          user: { id: string; display_name: string | null; photo_url: string | null };
        };

        setParentMessage({
          id: data.id,
          tenant_id: data.tenant_id,
          conversation_id: data.conversation_id,
          sender_id: data.sender_id,
          parent_id: data.parent_id,
          content: data.content,
          content_type: data.content_type as MessageContentType,
          is_event_chat: data.is_event_chat,
          created_at: data.created_at,
          updated_at: data.updated_at,
          deleted_at: data.deleted_at,
          // Flatten user data into sender object to match MessageWithSender type
          sender: {
            id: sender?.id ?? '',
            display_name: sender?.user?.display_name ?? null,
            photo_url: sender?.user?.photo_url ?? null,
          },
        } as MessageWithSender);
      }
    } catch (err) {
      setError(err as Error);
    }
  }, [parentMessageId, tenantId]);

  // Fetch thread messages
  const fetchMessages = useCallback(
    async (reset: boolean = false) => {
      if (!parentMessageId || !tenantId) {
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
            )
          `
          )
          .eq('parent_id', parentMessageId)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true }) // Chronological order (oldest first)
          .range(currentOffset, currentOffset + PAGE_SIZE - 1);

        if (fetchError) {
          throw fetchError;
        }

        const messagesWithSender = (data || []).map((msg) => {
          const sender = msg.sender as {
            id: string;
            user: { id: string; display_name: string | null; photo_url: string | null };
          };

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
            // Thread replies don't have reply_count (no nested threads)
            reply_count: 0,
          } as MessageWithSender;
        });

        if (reset) {
          setMessages(messagesWithSender);
        } else {
          // Append newer messages (for infinite scroll going forward)
          setMessages((prev) => [...prev, ...messagesWithSender]);
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
    [parentMessageId, tenantId, offset]
  );

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchMessages(false);
    }
  }, [loading, hasMore, fetchMessages]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchParentMessage(), fetchMessages(true)]);
  }, [fetchParentMessage, fetchMessages]);

  useEffect(() => {
    void fetchParentMessage();
    void fetchMessages(true);
  }, [parentMessageId, tenantId]);

  return {
    messages,
    parentMessage,
    loading,
    error,
    loadMore,
    hasMore,
    refetch,
  };
}

/**
 * Add a new reply to the thread messages list.
 * Used by the real-time subscription hook.
 * @returns The new messages array with the reply appended
 */
export function appendThreadMessage(
  prev: MessageWithSender[],
  newMessage: MessageWithSender
): MessageWithSender[] {
  return [...prev, newMessage];
}

/**
 * Update a reply in the thread messages list.
 * Used by the real-time subscription hook for message edits.
 * @returns The new messages array with the message updated
 */
export function updateThreadMessage(
  prev: MessageWithSender[],
  updatedMessage: MessageWithSender
): MessageWithSender[] {
  return prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg));
}

/**
 * Remove a reply from the thread messages list.
 * Used by the real-time subscription hook for message deletes.
 * @returns The new messages array with the message removed
 */
export function removeThreadMessage(
  prev: MessageWithSender[],
  messageId: string
): MessageWithSender[] {
  return prev.filter((msg) => msg.id !== messageId);
}
