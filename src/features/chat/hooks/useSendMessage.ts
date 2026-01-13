/**
 * Hook for sending messages in a conversation.
 *
 * Provides a mutation function for sending messages with tenant isolation.
 * Supports Event Chat mode for selective message visibility.
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MessageContentType, MessageWithSender } from '@/types/database';

/**
 * Type for the raw data returned from Supabase when inserting a message
 * with sender and quoted_message relations joined.
 */
interface MessageInsertResult {
  id: string;
  tenant_id: string;
  conversation_id: string;
  sender_id: string;
  parent_id: string | null;
  quoted_message_id: string | null;
  content: string;
  content_type: string;
  is_event_chat: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sender: {
    id: string;
    user: {
      id: string;
      display_name: string | null;
      photo_url: string | null;
    };
  };
  quoted_message: {
    id: string;
    content: string | null;
    sender: {
      id: string;
      user: {
        id: string;
        display_name: string | null;
      };
    };
  } | null;
}

/**
 * Type for the raw data returned from Supabase when inserting a reply
 * with only sender relation joined.
 */
interface ReplyInsertResult {
  id: string;
  tenant_id: string;
  conversation_id: string;
  sender_id: string;
  parent_id: string | null;
  content: string;
  content_type: string;
  is_event_chat: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sender: {
    id: string;
    user: {
      id: string;
      display_name: string | null;
      photo_url: string | null;
    };
  };
}

export interface SendMessageOptions {
  content: string;
  contentType?: MessageContentType;
  excludedMembershipIds?: string[]; // For Event Chat
  quoteAttachment?: {
    messageId: string;
    senderName: string;
    senderAvatar?: string | null;
    content: string;
  } | null;
}

export interface SendMessageState {
  sendMessage: (
    content: string,
    contentType?: MessageContentType
  ) => Promise<MessageWithSender | null>;
  sendMessageWithOptions: (options: SendMessageOptions) => Promise<MessageWithSender | null>;
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
    async (options: SendMessageOptions): Promise<MessageWithSender | null> => {
      const { content, contentType = 'text', excludedMembershipIds, quoteAttachment } = options;

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
        const isEventChat = excludedMembershipIds && excludedMembershipIds.length > 0;

        const { data, error: insertError } = await supabase
          .from('messages')
          .insert({
            tenant_id: tenantId,
            conversation_id: conversationId,
            sender_id: senderMembershipId,
            content: content.trim(),
            content_type: contentType,
            is_event_chat: isEventChat,
            quoted_message_id: quoteAttachment?.messageId || null,
          })
          .select(
            `
            id,
            tenant_id,
            conversation_id,
            sender_id,
            parent_id,
            quoted_message_id,
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
            quoted_message:messages!messages_quoted_message_id_fkey (
              id,
              content,
              sender:memberships!messages_sender_id_fkey (
                id,
                user:users!memberships_user_id_fkey (
                  id,
                  display_name
                )
              )
            )
          `
          )
          .single<MessageInsertResult>();

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
            console.error('Failed to insert event chat exclusions:', exclusionsError);
          }
        }

        // Update conversation updated_at to move it to top of list
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);

        // Transform data to match MessageWithSender type
        if (data) {
          return {
            id: data.id,
            tenant_id: data.tenant_id,
            conversation_id: data.conversation_id,
            sender_id: data.sender_id,
            parent_id: data.parent_id,
            quoted_message_id: data.quoted_message_id,
            content: data.content,
            content_type: data.content_type as MessageContentType,
            is_event_chat: data.is_event_chat,
            created_at: data.created_at,
            updated_at: data.updated_at,
            deleted_at: data.deleted_at,
            // Flatten user data into sender object to match MessageWithSender type
            sender: {
              id: data.sender?.id ?? '',
              display_name: data.sender?.user?.display_name ?? null,
              photo_url: data.sender?.user?.photo_url ?? null,
            },
            quoted_message: data.quoted_message
              ? {
                  id: data.quoted_message.id,
                  content: data.quoted_message.content,
                  sender: {
                    id: data.quoted_message.sender.id,
                    display_name: data.quoted_message.sender.user?.display_name ?? null,
                  },
                }
              : null,
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
      if (!conversationId || !tenantId || !senderMembershipId || !parentMessageId) {
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
          .single<ReplyInsertResult>();

        if (insertError) {
          throw insertError;
        }

        // Transform data to match MessageWithSender type
        if (data) {
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
            // Flatten user data into sender object to match MessageWithSender type
            sender: {
              id: data.sender?.id ?? '',
              display_name: data.sender?.user?.display_name ?? null,
              photo_url: data.sender?.user?.photo_url ?? null,
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
