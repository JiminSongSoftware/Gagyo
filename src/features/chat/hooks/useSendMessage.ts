/**
 * Hook for sending messages in a conversation.
 *
 * Provides a mutation function for sending messages with tenant isolation.
 * Supports Event Chat mode for selective message visibility.
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MessageContentType, MessageWithSender } from '@/types/database';

export interface SendMessageOptions {
  content: string;
  contentType?: MessageContentType;
  excludedMembershipIds?: string[]; // For Event Chat
}

export interface SendMessageState {
  sendMessage: (
    content: string,
    contentType?: MessageContentType
  ) => Promise<MessageWithSender | null>;
  sendMessageWithOptions: (
    options: SendMessageOptions
  ) => Promise<MessageWithSender | null>;
  sending: boolean;
  error: Error | null;
}

/**
 * Hook for sending messages in a conversation.
 *
 * @param conversationId - The conversation ID to send messages to
 * @param tenantId - The tenant ID for the message
 * @param senderMembershipId - The sender's membership ID
 * @returns SendMessageState with sendMessage function, sending state, and error
 *
 * @example
 * ```tsx
 * function MessageInput() {
 *   const { sendMessage, sendMessageWithOptions, sending, error } = useSendMessage(
 *     conversationId,
 *     tenantId,
 *     membershipId
 *   );
 *
 *   const handleSend = async () => {
 *     await sendMessage(inputText);
 *     setInputText('');
 *   };
 *
 *   const handleEventChatSend = async (excludedIds: string[]) => {
 *     await sendMessageWithOptions({
 *       content: inputText,
 *       excludedMembershipIds: excludedIds,
 *     });
 *     setInputText('');
 *   };
 *
 *   return (
 *     <View>
 *       <TextInput value={inputText} onChangeText={setInputText} />
 *       <Button onPress={handleSend} disabled={sending || !inputText.trim()}>
 *         Send
 *       </Button>
 *       {error && <Text>{error.message}</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useSendMessage(
  conversationId: string | null,
  tenantId: string | null,
  senderMembershipId: string | null
): SendMessageState {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessageWithOptions = useCallback(
    async (
      options: SendMessageOptions
    ): Promise<MessageWithSender | null> => {
      const { content, contentType = 'text', excludedMembershipIds } = options;

      if (!conversationId || !tenantId || !senderMembershipId) {
        setError(new Error('Missing required parameters'));
        return null;
      }

      if (!content.trim()) {
        setError(new Error('Message content cannot be empty'));
        return null;
      }

      // Event Chat validation
      if (excludedMembershipIds && excludedMembershipIds.length > 0) {
        // Validate max 5 exclusions
        if (excludedMembershipIds.length > 5) {
          setError(new Error('Cannot exclude more than 5 users'));
          return null;
        }

        // Validate sender not in exclusion list
        if (excludedMembershipIds.includes(senderMembershipId)) {
          setError(new Error('Cannot exclude yourself'));
          return null;
        }
      }

      setSending(true);
      setError(null);

      try {
        const isEventChat =
          excludedMembershipIds && excludedMembershipIds.length > 0;

        const { data, error: insertError } = await supabase
          .from('messages')
          .insert({
            tenant_id: tenantId,
            conversation_id: conversationId,
            sender_id: senderMembershipId,
            content: content.trim(),
            content_type: contentType,
            is_event_chat: isEventChat,
          })
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
          .single();

        if (insertError) {
          throw insertError;
        }

        // If Event Chat, insert exclusions after message creation
        if (data && isEventChat && excludedMembershipIds) {
          const exclusions = excludedMembershipIds.map((membershipId) => ({
            message_id: data.id,
            excluded_membership_id: membershipId,
            tenant_id: tenantId,
          }));

          const { error: exclusionsError } = await supabase
            .from('event_chat_exclusions')
            .insert(exclusions);

          if (exclusionsError) {
            // Log error but don't fail the message send
            console.error(
              'Failed to insert event chat exclusions:',
              exclusionsError
            );
          }
        }

        // Update conversation updated_at to move it to top of list
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);

        // Transform data to match MessageWithSender type
        if (data) {
          const sender = data.sender as {
            id: string;
            user: { id: string; display_name: string | null; photo_url: string | null };
          };

          return {
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
            sender: {
              id: sender?.id ?? '',
              user: {
                id: sender?.user?.id ?? '',
                display_name: sender?.user?.display_name ?? null,
                photo_url: sender?.user?.photo_url ?? null,
              },
            },
          } as MessageWithSender;
        }

        return null;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [conversationId, tenantId, senderMembershipId]
  );

  const sendMessage = useCallback(
    async (
      content: string,
      contentType: MessageContentType = 'text'
    ): Promise<MessageWithSender | null> => {
      return sendMessageWithOptions({ content, contentType });
    },
    [sendMessageWithOptions]
  );

  return {
    sendMessage,
    sendMessageWithOptions,
    sending,
    error,
  };
}

/**
 * Hook for sending a reply to a parent message (thread).
 *
 * @param conversationId - The conversation ID
 * @param tenantId - The tenant ID
 * @param senderMembershipId - The sender's membership ID
 * @param parentMessageId - The parent message ID to reply to
 * @returns SendMessageState with sendReply function for replies
 */
export interface SendReplyState {
  sendReply: (
    content: string,
    contentType?: MessageContentType
  ) => Promise<MessageWithSender | null>;
  sending: boolean;
  error: Error | null;
}

export function useSendReply(
  conversationId: string | null,
  tenantId: string | null,
  senderMembershipId: string | null,
  parentMessageId: string | null
): SendReplyState {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendReply = useCallback(
    async (
      content: string,
      contentType: MessageContentType = 'text'
    ): Promise<MessageWithSender | null> => {
      if (
        !conversationId ||
        !tenantId ||
        !senderMembershipId ||
        !parentMessageId
      ) {
        setError(new Error('Missing required parameters'));
        return null;
      }

      if (!content.trim()) {
        setError(new Error('Message content cannot be empty'));
        return null;
      }

      setSending(true);
      setError(null);

      try {
        // Check if parent message already has a parent (prevent nested threads)
        const { data: parentMessage, error: parentError } = await supabase
          .from('messages')
          .select('parent_id')
          .eq('id', parentMessageId)
          .eq('tenant_id', tenantId)
          .single();

        if (parentError) {
          throw new Error('Failed to verify parent message');
        }

        if (parentMessage?.parent_id) {
          throw new Error('Cannot reply to a reply');
        }

        const { data, error: insertError } = await supabase
          .from('messages')
          .insert({
            tenant_id: tenantId,
            conversation_id: conversationId,
            sender_id: senderMembershipId,
            parent_id: parentMessageId,
            content: content.trim(),
            content_type: contentType,
          })
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
          .single();

        if (insertError) {
          throw insertError;
        }

        // Transform data to match MessageWithSender type
        if (data) {
          const sender = data.sender as {
            id: string;
            user: { id: string; display_name: string | null; photo_url: string | null };
          };

          return {
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
            sender: {
              id: sender?.id ?? '',
              user: {
                id: sender?.user?.id ?? '',
                display_name: sender?.user?.display_name ?? null,
                photo_url: sender?.user?.photo_url ?? null,
              },
            },
          } as MessageWithSender;
        }

        return null;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [conversationId, tenantId, senderMembershipId, parentMessageId]
  );

  return {
    sendReply,
    sending,
    error,
  };
}
