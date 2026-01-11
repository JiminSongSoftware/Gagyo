/**
 * Thread View Screen
 *
 * Dedicated screen for viewing and replying to a message thread.
 *
 * Layout:
 * - Header: Back button + "Thread" + channel name
 * - Parent message: Sticky at top
 * - Thread replies: Chronological list below
 * - Message input: Always visible, posts to thread only
 *
 * Route: /chat/thread/[id]?channelName=...
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { YStack, Stack as TamaguiStack, Text as TamaguiText, XStack } from 'tamagui';
import { useTranslation } from '@/i18n';
import { MessageList } from '@/features/chat/components/MessageList';
import { MessageInput } from '@/features/chat/components/MessageInput';
import { useThreadMessages } from '@/features/chat/hooks/useThreadMessages';
import { useSendReply } from '@/features/chat/hooks/useSendMessage';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useCurrentMembership } from '@/hooks/useCurrentMembership';

/**
 * Parent message display component (sticky at top).
 */
function ParentMessage({
  senderName,
  content,
  timestamp,
}: {
  senderName: string;
  content: string;
  timestamp: string;
}) {
  return (
    <YStack
      backgroundColor="$backgroundTertiary"
      padding="$3"
      borderBottomWidth={1}
      borderBottomColor="$border"
    >
      <XStack alignItems="center" gap="$2" marginBottom="$2">
        <TamaguiText fontSize="$xs" fontWeight="600" color="$color2">
          {senderName}
        </TamaguiText>
        <TamaguiText fontSize="$xs" color="$color3">
          {timestamp}
        </TamaguiText>
      </XStack>
      <TamaguiText fontSize="$4" color="$color1" lineHeight="$5">
        {content}
      </TamaguiText>
    </YStack>
  );
}

/**
 * Thread view screen component.
 */
export default function ThreadViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { tenantId } = useRequireAuth();
  const { membershipId } = useCurrentMembership();

  const {
    messages: replies,
    parentMessage,
    loading,
    error,
    hasMore,
    loadMore,
  } = useThreadMessages(id || null, tenantId);

  // Get conversation details from parent message
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (parentMessage?.conversation_id) {
      setConversationId(parentMessage.conversation_id);
    }
  }, [parentMessage]);

  const { sendReply, sending } = useSendReply(conversationId, tenantId, membershipId, id || null);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSendReply = useCallback(
    async (content: string) => {
      await sendReply(content);
    },
    [sendReply]
  );

  // Thread replies cannot be pressed (no nested threads)
  const handleMessagePress = useCallback(() => {
    // No-op: thread replies cannot have threads
  }, []);

  if (!parentMessage && loading) {
    return (
      <TamaguiStack flex={1} alignItems="center" justifyContent="center">
        <TamaguiText>{t('chat.thread.loadingReplies')}</TamaguiText>
      </TamaguiStack>
    );
  }

  // Show empty state when no replies
  if (!loading && parentMessage && replies.length === 0) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <ParentMessage
          senderName={parentMessage.sender?.display_name || 'Unknown'}
          content={parentMessage.content || ''}
          timestamp={new Date(parentMessage.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        />
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$3">
          <TamaguiText fontSize={48}>💬</TamaguiText>
          <TamaguiText fontSize="$lg" fontWeight="600" color="$color1" textAlign="center">
            {t('chat.thread.noReplies')}
          </TamaguiText>
        </YStack>
        <MessageInput
          conversationId={conversationId || undefined}
          placeholder={t('chat.thread.inputPlaceholder')}
          onSend={handleSendReply}
          sending={sending}
          error={null}
          testID="thread-reply-input"
        />
      </YStack>
    );
  }

  return (
    <>
      {/* Header */}
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('chat.thread.title'),
          headerLeft: () => (
            <Pressable onPress={handleBack} hitSlop={16}>
              <XStack paddingHorizontal="$3" paddingVertical="$2">
                <Ionicons name="chevron-back" size={24} color="$color1" />
              </XStack>
            </Pressable>
          ),
        }}
      />

      {/* Content */}
      <YStack flex={1} backgroundColor="$background">
        {/* Parent message (sticky) */}
        {parentMessage && (
          <ParentMessage
            senderName={parentMessage.sender?.display_name || 'Unknown'}
            content={parentMessage.content || ''}
            timestamp={new Date(parentMessage.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
        )}

        {/* Thread replies */}
        <MessageList
          messages={replies}
          loading={loading && replies.length === 0}
          loadingMore={false}
          hasMore={hasMore}
          error={error}
          conversationType="small_group"
          currentUserId={membershipId || ''}
          onLoadMore={() => void loadMore()}
          onMessagePress={handleMessagePress}
          showThreadIndicators={false} // Replies don't show thread indicators
          testID="thread-replies-list"
        />

        {/* Message input */}
        <MessageInput
          conversationId={conversationId || undefined}
          placeholder={t('chat.thread.inputPlaceholder')}
          onSend={handleSendReply}
          sending={sending}
          error={null}
          testID="thread-reply-input"
        />
      </YStack>
    </>
  );
}
