/**
 * Hook for sending messages in a conversation.
 *
 * Provides a mutation function for sending messages with tenant isolation.
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MessageContentType } from '@/types/database';

export interface SendMessageState {
  sendMessage: (
    content: string,
    contentType?: MessageContentType
  ) => Promise<void>;
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
 *   const { sendMessage, sending, error } = useSendMessage(
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

  const sendMessage = useCallback(
    async (
      content: string,
      contentType: MessageContentType = 'text'
    ): Promise<void> => {
      if (!conversationId || !tenantId || !senderMembershipId) {
        setError(new Error('Missing required parameters'));
        return;
      }

      if (!content.trim()) {
        setError(new Error('Message content cannot be empty'));
        return;
      }

      setSending(true);
      setError(null);

      try {
        const { error: insertError } = await supabase.from('messages').insert({
          tenant_id: tenantId,
          conversation_id: conversationId,
          sender_id: senderMembershipId,
          content: content.trim(),
          content_type: contentType,
        });

        if (insertError) {
          throw insertError;
        }

        // Update conversation updated_at to move it to top of list
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [conversationId, tenantId, senderMembershipId]
  );

  return {
    sendMessage,
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
 * @returns SendMessageState with sendMessage function for replies
 */
export function useSendReply(
  conversationId: string | null,
  tenantId: string | null,
  senderMembershipId: string | null,
  parentMessageId: string | null
): SendMessageState {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(
    async (
      content: string,
      contentType: MessageContentType = 'text'
    ): Promise<void> => {
      if (
        !conversationId ||
        !tenantId ||
        !senderMembershipId ||
        !parentMessageId
      ) {
        setError(new Error('Missing required parameters'));
        return;
      }

      if (!content.trim()) {
        setError(new Error('Message content cannot be empty'));
        return;
      }

      setSending(true);
      setError(null);

      try {
        const { error: insertError } = await supabase.from('messages').insert({
          tenant_id: tenantId,
          conversation_id: conversationId,
          sender_id: senderMembershipId,
          parent_id: parentMessageId,
          content: content.trim(),
          content_type: contentType,
        });

        if (insertError) {
          throw insertError;
        }
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
    sendMessage,
    sending,
    error,
  };
}
