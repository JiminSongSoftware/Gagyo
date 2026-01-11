/**
 * Chat Screen Container
 *
 * Main chat screen that integrates:
 * - MessageList with blur effect
 * - MessageActionSheet for message actions
 * - MessageInput with quote preview support
 *
 * Actions:
 * - Reply in thread: Navigate to thread view
 * - Quote in reply: Set quote attachment in store
 * - Copy text: Copy to clipboard with toast
 */

import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Clipboard } from 'react-native';
import { Stack } from 'tamagui';
import { useTranslation } from '@/i18n';
import { Toast } from '@/components/ui/Toast';
import { useChatStore } from '../store/chatStore';
import { MessageList } from '../components/MessageList';
import { MessageActionSheet } from '../components/MessageActionSheet';
import type { MessageListProps } from '../components/MessageList';
import type { MessageWithSender } from '@/types/database';

export interface ChatScreenProps extends Omit<MessageListProps, 'onMessagePress'> {
  /**
   * The conversation/channel ID for navigation.
   */
  conversationId: string;

  /**
   * The conversation name for thread view title.
   */
  conversationName: string;
}

/**
 * Chat screen with action menu integration.
 */
export function ChatScreen({
  conversationId: _conversationId, // Reserved for future use (e.g., analytics, context passing)
  conversationName,
  messages,
  highlightedMessageId,
  loading,
  loadingMore,
  hasMore,
  error,
  conversationType,
  currentUserId,
  onLoadMore,
  onSenderPress,
  showThreadIndicators,
  testID,
}: ChatScreenProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { selectedMessage, setSelectedMessage, setQuoteAttachment } = useChatStore();

  // Handle message press - show action menu
  const handleMessagePress = useCallback(
    (message: MessageWithSender) => {
      // Don't show action menu for system messages
      if (message.content_type === 'system') {
        return;
      }
      setSelectedMessage(message);
    },
    [setSelectedMessage]
  );

  // Handle reply in thread - navigate to thread view
  const handleReplyInThread = useCallback(
    (message: MessageWithSender) => {
      void router.push(
        `/chat/thread/${message.id}?channelName=${encodeURIComponent(conversationName)}`
      );
    },
    [router, conversationName]
  );

  // Handle quote in reply - set quote attachment
  const handleQuoteInReply = useCallback(
    (message: MessageWithSender) => {
      if (message.sender?.user) {
        setQuoteAttachment({
          messageId: message.id,
          senderName: message.sender.user.display_name || 'Unknown',
          senderAvatar: message.sender.user.photo_url,
          content: message.content || '',
        });
      }
    },
    [setQuoteAttachment]
  );

  // Handle copy text - copy to clipboard with toast
  const handleCopyText = useCallback(
    (message: MessageWithSender) => {
      const text = message.content || '';
      if (!text) {
        Toast.show(t('chat.message.nothingToCopy'), 'info');
        return;
      }

      Clipboard.setString(text);
      Toast.show(t('chat.message.copied'), 'success');
    },
    [t]
  );

  // Handle action sheet dismiss
  const handleDismissActionSheet = useCallback(() => {
    setSelectedMessage(null);
  }, [setSelectedMessage]);

  return (
    <Stack flex={1}>
      {/* Message List */}
      <MessageList
        messages={messages}
        highlightedMessageId={highlightedMessageId}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        error={error}
        conversationType={conversationType}
        currentUserId={currentUserId}
        onLoadMore={onLoadMore}
        onMessagePress={handleMessagePress}
        onSenderPress={onSenderPress}
        showThreadIndicators={showThreadIndicators}
        testID={testID}
      />

      {/* Message Action Sheet */}
      {selectedMessage && (
        <MessageActionSheet
          message={selectedMessage}
          visible={!!selectedMessage}
          onDismiss={handleDismissActionSheet}
          onReplyInThread={handleReplyInThread}
          onQuoteInReply={handleQuoteInReply}
          onCopyText={handleCopyText}
          replyCount={selectedMessage.reply_count}
        />
      )}
    </Stack>
  );
}
