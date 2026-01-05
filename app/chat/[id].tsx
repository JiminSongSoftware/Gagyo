/**
 * Chat detail screen.
 *
 * Displays a single conversation with messages and input.
 * Features:
 * - Paginated message list
 * - Real-time message updates
 * - Send text messages
 * - Room type background colors
 * - Header with conversation name
 * - Navigation back to chat list
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Stack as TamaguiStack, useTheme, X } from 'tamagui';
import { useTranslation } from '@/i18n';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useCurrentMembership } from '@/hooks/useCurrentMembership';
import {
  useMessages,
  useSendMessage,
  useMessageSubscription,
  appendMessage,
  updateMessage,
  removeMessage,
} from '@/features/chat/hooks';
import { MessageList, MessageInput } from '@/features/chat/components';
import { getRoomBackgroundColor } from '@/features/chat/utils/getRoomBackgroundColor';
import { supabase } from '@/lib/supabase';
import type { ConversationType, MessageWithSender } from '@/types/database';
import type { SendMessageOptions } from '@/features/chat/hooks/useSendMessage';

export default function ChatDetailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { tenantId } = useRequireAuth();
  const { membershipId } = useCurrentMembership();

  const conversationId = params.id;

  // Fetch conversation details (type, name) for header
  const [conversationType, setConversationType] = useState<ConversationType>('direct');
  const [conversationName, setConversationName] = useState<string | null>(null);

  // Fetch messages for this conversation
  const { messages, loading, error, loadMore, hasMore } = useMessages(conversationId, tenantId);

  // Local state for real-time message updates
  // This combines initial messages with real-time updates
  const [realTimeMessages, setRealTimeMessages] = useState<MessageWithSender[]>([]);

  // Update local state when initial messages load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setRealTimeMessages(messages);
    }
  }, [messages, loading]);

  // Use real-time messages for display
  const displayMessages = useMemo(() => {
    return realTimeMessages.length > 0 ? realTimeMessages : messages;
  }, [realTimeMessages, messages]);

  // Send message mutation
  const {
    sendMessage,
    sendMessageWithOptions,
    sending: sendingMessage,
    error: sendError,
  } = useSendMessage(conversationId, tenantId, membershipId);

  // Fetch conversation details
  useEffect(() => {
    if (!conversationId || !tenantId) return;

    const fetchConversationDetails = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('type, name')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .single();

      if (data) {
        setConversationType(data.type);
        setConversationName(data.name);
      }
    };

    void fetchConversationDetails();
  }, [conversationId, tenantId]);

  // Helper to increment reply count on parent message
  const incrementParentReplyCount = useCallback((parentId: string) => {
    setRealTimeMessages((prev) =>
      prev.map((msg) =>
        msg.id === parentId
          ? { ...msg, reply_count: (msg.reply_count || 0) + 1 }
          : msg
      )
    );
  }, []);

  // Helper to decrement reply count on parent message
  const decrementParentReplyCount = useCallback((parentId: string) => {
    setRealTimeMessages((prev) =>
      prev.map((msg) =>
        msg.id === parentId
          ? { ...msg, reply_count: Math.max(0, (msg.reply_count || 0) - 1) }
          : msg
      )
    );
  }, []);

  // Subscribe to real-time message updates
  useMessageSubscription(conversationId, tenantId, {
    onInsert: useCallback((message: MessageWithSender) => {
      // If this is a thread reply, increment the parent's reply count
      if (message.parent_id) {
        incrementParentReplyCount(message.parent_id);
        // Don't add thread replies to the main message list
        return;
      }
      // Add top-level message to the list
      setRealTimeMessages((prev) => appendMessage(prev, message));
    }, [incrementParentReplyCount]),
    onUpdate: useCallback((message: MessageWithSender) => {
      setRealTimeMessages((prev) => updateMessage(prev, message));
    }, []),
    onDelete: useCallback((messageId: string, oldMessage?: MessageWithSender) => {
      // If deleted message had a parent_id (thread reply), decrement parent's reply count
      // Note: oldMessage may not be available in all cases
      if (oldMessage?.parent_id) {
        decrementParentReplyCount(oldMessage.parent_id);
        return;
      }
      // Remove top-level message from the list
      setRealTimeMessages((prev) => removeMessage(prev, messageId));
    }, [decrementParentReplyCount]),
    onError: useCallback((err: Error) => {
      console.error('Message subscription error:', err);
    }, []),
  });

  // Update last_read_at when viewing conversation
  useEffect(() => {
    if (!conversationId || !membershipId) return;

    const updateLastRead = async () => {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('membership_id', membershipId);
    };

    // Update on mount and when messages change
    void updateLastRead();
  }, [conversationId, membershipId, displayMessages.length]);

  const handleSend = useCallback(
    async (content: string) => {
      await sendMessage(content);
    },
    [sendMessage]
  );

  const handleSendEventChat = useCallback(
    async (options: SendMessageOptions) => {
      await sendMessageWithOptions(options);
    },
    [sendMessageWithOptions]
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleMessagePress = useCallback((message: MessageWithSender) => {
    // Navigate to thread view if message has replies or is a top-level message
    // Only top-level messages can have threads (parent_id is null)
    if (!message.parent_id) {
      router.push(`/chat/thread/${message.id}`);
    }
  }, [router]);

  const getHeaderTitle = useCallback(() => {
    if (conversationName) {
      return conversationName;
    }
    switch (conversationType) {
      case 'small_group':
        return t('chat.small_group');
      case 'ministry':
        return t('chat.ministry');
      case 'church_wide':
        return t('chat.church_wide');
      default:
        return t('chat.chat');
    }
  }, [conversationName, conversationType, t]);

  return (
    <>
      {/* Header */}
      <Stack.Screen
        options={{
          title: getHeaderTitle(),
          headerShown: true,
          headerLeft: () => (
            <TamaguiStack px="$4" onPress={handleBack}>
              <X size={24} color={theme.color1?.val} />
            </TamaguiStack>
          ),
        }}
      />

      {/* Content */}
      <TamaguiStack
        testID="chat-detail-screen"
        flex={1}
        backgroundColor={getRoomBackgroundColor(conversationType)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Message list */}
          <MessageList
            messages={displayMessages}
            loading={loading}
            loadingMore={!loading && sendingMessage}
            hasMore={hasMore}
            error={error}
            conversationType={conversationType}
            currentUserId={membershipId || ''}
            onLoadMore={() => void loadMore()}
            onMessagePress={handleMessagePress}
          />

          {/* Message input */}
          <TamaguiStack
            paddingHorizontal="$3"
            paddingVertical="$2"
            backgroundColor="$background"
            borderTopWidth={1}
            borderTopColor="$borderLight"
          >
            <MessageInput
              onSend={handleSend}
              onSendEventChat={handleSendEventChat}
              sending={sendingMessage}
              error={sendError}
              conversationId={conversationId}
              tenantId={tenantId}
              currentMembershipId={membershipId}
            />
          </TamaguiStack>
        </KeyboardAvoidingView>
      </TamaguiStack>
    </>
  );
}
