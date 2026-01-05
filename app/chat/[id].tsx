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

  // Subscribe to real-time message updates
  useMessageSubscription(conversationId, tenantId, {
    onInsert: useCallback((message: MessageWithSender) => {
      setRealTimeMessages((prev) => appendMessage(prev, message));
    }, []),
    onUpdate: useCallback((message: MessageWithSender) => {
      setRealTimeMessages((prev) => updateMessage(prev, message));
    }, []),
    onDelete: useCallback((messageId: string) => {
      setRealTimeMessages((prev) => removeMessage(prev, messageId));
    }, []),
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

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleMessagePress = useCallback((message: MessageWithSender) => {
    // Future: Open thread view or expand image
    console.log('Message pressed:', message.id);
  }, []);

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
            <MessageInput onSend={handleSend} sending={sendingMessage} error={sendError} />
          </TamaguiStack>
        </KeyboardAvoidingView>
      </TamaguiStack>
    </>
  );
}
