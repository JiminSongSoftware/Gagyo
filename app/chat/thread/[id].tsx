/**
 * Thread view screen.
 *
 * Displays replies to a specific message (thread).
 * Features:
 * - Parent message displayed at top
 * - Paginated thread replies
 * - Real-time reply updates
 * - Send replies to thread
 * - Header with "Thread" title
 * - Navigation back to chat detail
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Stack as TamaguiStack,
  useTheme,
  X,
  YStack,
  Text,
  Spinner,
  XStack,
  Text as TamaguiText,
} from 'tamagui';
import { useTranslation } from '@/i18n';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useCurrentMembership } from '@/hooks/useCurrentMembership';
import {
  useThreadMessages,
  useSendReply,
  appendThreadMessage,
  updateThreadMessage,
  removeThreadMessage,
} from '@/features/chat/hooks';
import { MessageList, MessageBubble } from '@/features/chat/components';
import { getRoomBackgroundColor } from '@/features/chat/utils/getRoomBackgroundColor';
import { supabase } from '@/lib/supabase';
import type { ConversationType, MessageWithSender } from '@/types/database';

export default function ThreadViewScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { tenantId } = useRequireAuth();
  const { membershipId } = useCurrentMembership();

  const parentMessageId = params.id;

  // Fetch thread messages and parent message
  const { messages, parentMessage, loading, error, loadMore, hasMore } = useThreadMessages(
    parentMessageId,
    tenantId
  );

  // Local state for real-time message updates
  const [realTimeMessages, setRealTimeMessages] = useState<MessageWithSender[]>([]);

  // Conversation details for background color
  const [conversationType, setConversationType] = useState<ConversationType>('direct');
  const [conversationId, setConversationId] = useState<string | null>(null);

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

  // Extract conversationId from parent message
  useEffect(() => {
    if (parentMessage?.conversation_id) {
      setConversationId(parentMessage.conversation_id);
    }
  }, [parentMessage]);

  // Fetch conversation type for background color
  useEffect(() => {
    if (!conversationId || !tenantId) return;

    const fetchConversationDetails = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('type')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .single();

      if (data) {
        setConversationType(data.type);
      }
    };

    void fetchConversationDetails();
  }, [conversationId, tenantId]);

  // Send reply mutation
  const {
    sendReply,
    sending: sendingReply,
    error: sendError,
  } = useSendReply(conversationId, tenantId, membershipId, parentMessageId);

  // Subscribe to real-time thread updates
  useEffect(() => {
    if (!parentMessageId || !tenantId) return;

    const channel = supabase
      .channel(`thread:${parentMessageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `parent_id=eq.${parentMessageId}`,
        },
        (payload) => {
          // Fetch the complete message with sender info
          void (async () => {
            const { data } = await supabase
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
              .eq('id', payload.new.id)
              .single();

            if (data) {
              const sender = data.sender as {
                id: string;
                user: { id: string; display_name: string | null; photo_url: string | null };
              };

              const newMessage: MessageWithSender = {
                id: data.id,
                tenant_id: data.tenant_id,
                conversation_id: data.conversation_id,
                sender_id: data.sender_id,
                parent_id: data.parent_id,
                content: data.content,
                content_type: data.content_type as MessageWithSender['content_type'],
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
                reply_count: 0,
              };

              setRealTimeMessages((prev) => appendThreadMessage(prev, newMessage));
            }
          })();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `parent_id=eq.${parentMessageId}`,
        },
        (payload) => {
          // Fetch the updated message with sender info
          void (async () => {
            const { data } = await supabase
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
              .eq('id', payload.new.id)
              .single();

            if (data) {
              const sender = data.sender as {
                id: string;
                user: { id: string; display_name: string | null; photo_url: string | null };
              };

              const updatedMessage: MessageWithSender = {
                id: data.id,
                tenant_id: data.tenant_id,
                conversation_id: data.conversation_id,
                sender_id: data.sender_id,
                parent_id: data.parent_id,
                content: data.content,
                content_type: data.content_type as MessageWithSender['content_type'],
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
                reply_count: 0,
              };

              setRealTimeMessages((prev) => updateThreadMessage(prev, updatedMessage));
            }
          })();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `parent_id=eq.${parentMessageId}`,
        },
        (payload) => {
          setRealTimeMessages((prev) => removeThreadMessage(prev, payload.old.id as string));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [parentMessageId, tenantId]);

  const handleSendReply = useCallback(
    async (content: string) => {
      await sendReply(content);
    },
    [sendReply]
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Thread replies cannot be pressed (no nested threads)
  const handleMessagePress = useCallback(() => {
    // No-op: thread replies cannot have threads
  }, []);

  // Render empty state for threads
  const renderEmptyState = () => (
    <YStack
      testID="thread-empty-state"
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="$4"
    >
      <Text color="$colorSubtle" fontSize="$5" textAlign="center">
        {t('chat.thread_no_replies')}
      </Text>
      <Text color="$colorSubtle" fontSize="$3" textAlign="center" marginTop="$2">
        {t('chat.thread_start_conversation')}
      </Text>
    </YStack>
  );

  return (
    <>
      {/* Header */}
      <Stack.Screen
        options={{
          title: t('chat.thread_title'),
          headerShown: true,
          headerLeft: () => (
            <TamaguiStack testID="thread-back-button" px="$4" onPress={handleBack}>
              <X size={24} color={theme.color1?.val} />
            </TamaguiStack>
          ),
        }}
      />

      {/* Content */}
      <TamaguiStack
        testID="thread-view-screen"
        flex={1}
        backgroundColor={getRoomBackgroundColor(conversationType)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Parent message - sticky at top */}
          {parentMessage && (
            <YStack
              padding="$3"
              backgroundColor="$backgroundStrong"
              borderBottomWidth={1}
              borderBottomColor="$borderLight"
            >
              <MessageBubble
                message={parentMessage}
                isOwnMessage={parentMessage.sender_id === membershipId}
                conversationType={conversationType}
                showThreadIndicator={false}
              />
            </YStack>
          )}

          {/* Thread replies list */}
          {loading ? (
            <YStack flex={1} justifyContent="center" alignItems="center">
              <Spinner size="large" color="$color" />
            </YStack>
          ) : displayMessages.length === 0 ? (
            renderEmptyState()
          ) : (
            <MessageList
              testID="thread-reply-list"
              messages={displayMessages}
              loading={false}
              loadingMore={sendingReply}
              hasMore={hasMore}
              error={error}
              conversationType={conversationType}
              currentUserId={membershipId || ''}
              onLoadMore={() => void loadMore()}
              onMessagePress={handleMessagePress}
              showThreadIndicators={false}
            />
          )}

          {/* Reply input */}
          <TamaguiStack
            paddingHorizontal="$3"
            paddingVertical="$2"
            backgroundColor="$background"
            borderTopWidth={1}
            borderTopColor="$borderLight"
          >
            <ThreadReplyInput
              onSend={handleSendReply}
              sending={sendingReply}
              error={sendError}
              placeholder={t('chat.thread_reply_placeholder')}
              enabled={!!conversationId && !!parentMessage}
            />
          </TamaguiStack>
        </KeyboardAvoidingView>
      </TamaguiStack>
    </>
  );
}

/**
 * Simplified reply input for threads (no Event Chat mode).
 */
interface ThreadReplyInputProps {
  onSend: (content: string) => Promise<void>;
  sending: boolean;
  error: Error | null;
  placeholder: string;
  enabled?: boolean;
}

function ThreadReplyInput({ onSend, sending, error, placeholder, enabled = true }: ThreadReplyInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const theme = useTheme();

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending || !enabled) return;
    const content = text.trim();
    setText('');
    await onSend(content);
  }, [text, sending, onSend, enabled]);

  const isDisabled = !enabled || sending;

  return (
    <YStack>
      <XStack alignItems="center" gap="$2">
        <TextInput
          testID="thread-reply-input"
          style={[
            styles.input,
            {
              backgroundColor: theme.background?.val,
              color: theme.color?.val,
              borderColor: theme.borderColor?.val,
              opacity: isDisabled ? 0.5 : 1,
            },
          ]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={theme.colorSubtle?.val}
          multiline
          maxLength={4000}
          editable={!isDisabled}
        />
        <TouchableOpacity
          testID="thread-send-button"
          onPress={() => void handleSend()}
          disabled={!text.trim() || isDisabled}
          style={[
            styles.sendButton,
            {
              backgroundColor: text.trim() && !isDisabled ? theme.blue10?.val : theme.gray8?.val,
            },
          ]}
        >
          <TamaguiText fontSize="$md" color="white">
            {t('chat.send')}
          </TamaguiText>
        </TouchableOpacity>
      </XStack>
      {error && (
        <TamaguiText color="$red10" fontSize="$2" marginTop="$1">
          {error.message}
        </TamaguiText>
      )}
      {!enabled && (
        <TamaguiText color="$colorSubtle" fontSize="$2" marginTop="$1">
          Loading conversation...
        </TamaguiText>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
