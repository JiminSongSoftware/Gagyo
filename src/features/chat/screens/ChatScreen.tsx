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

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'tamagui';
import { useTranslation } from '@/i18n';
import { Toast } from '@/components/ui/Toast';
import { useChatStore } from '../store/chatStore';
import { MessageList } from '../components/MessageList';
import { MessageActionSheet } from '../components/MessageActionSheet';
import type { MessageWithSender, ConversationType } from '@/types/database';

export interface ChatScreenProps {
  /**
   * List of messages to display.
   */
  messages: MessageWithSender[];

  /**
   * ID of the message to highlight (for search results).
   */
  highlightedMessageId?: string | null;

  /**
   * Whether messages are currently loading.
   */
  loading: boolean;

  /**
   * Whether more messages are being loaded (pagination).
   */
  loadingMore?: boolean;

  /**
   * Whether there are more messages to load.
   */
  hasMore?: boolean;

  /**
   * Error to display, if any.
   */
  error: Error | null;

  /**
   * The conversation type.
   */
  conversationType: ConversationType;

  /**
   * The current user's membership ID.
   */
  currentUserId: string;

  /**
   * Callback to load more messages (pagination).
   */
  onLoadMore?: () => void;

  /**
   * Callback when sender avatar is pressed.
   */
  onSenderPress?: (membershipId: string) => void;

  /**
   * Whether to show thread indicators on messages.
   */
  showThreadIndicators?: boolean;

  /**
   * Test ID for E2E testing.
   */
  testID?: string;
}

/**
 * System sender ID constant.
 * Messages from this sender should not show the action menu.
 */
const SYSTEM_SENDER_ID = 'system';

/**
 * Chat screen with action menu integration.
 */
export function ChatScreen({
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

  // Toast state for declarative API
  const [showToast, setShowToast] = useState(false);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Handle message press - show action menu
  const handleMessagePress = useCallback(
    (message: MessageWithSender) => {
      // Don't show action menu for system messages
      if (message.sender_id === SYSTEM_SENDER_ID) {
        return;
      }
      setSelectedMessage(message);
    },
    [setSelectedMessage]
  );

  // Handle reply in thread - navigate to thread view
  const handleReplyInThread = useCallback(
    (message: MessageWithSender) => {
      void router.push(`/chat/thread/${message.id}`);
    },
    [router]
  );

  // Handle quote in reply - set quote attachment
  const handleQuoteInReply = useCallback(
    (message: MessageWithSender) => {
      setQuoteAttachment({
        messageId: message.id,
        senderName: message.sender?.display_name || t('chat.unknown_sender'),
        senderAvatar: message.sender?.photo_url,
        content: message.content || '',
      });
    },
    [setQuoteAttachment, t]
  );

  // Handle copy text - copy to clipboard with toast
  const handleCopyText = useCallback((message: MessageWithSender) => {
    const text = message.content || '';
    Clipboard.setStringAsync(text)
      .then(() => {
        setShowToast(true);
      })
      .catch((error) => {
        console.error('Failed to copy text:', error);
        // Optionally show error toast here in the future
        // For now, silent failure is acceptable per requirements
      });
  }, []);

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

      {/* Toast Notification */}
      <Toast
        visible={showToast}
        message={t('chat.message.copied')}
        onDismiss={() => setShowToast(false)}
      />
    </Stack>
  );
}
