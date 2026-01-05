/**
 * Message list component.
 *
 * Displays a paginated list of messages with:
 * - FlatList with inverted prop (newest at bottom)
 * - Date separators between days
 * - Loading indicator at top for pagination
 * - Empty state
 * - Error state
 * - Auto-scroll to bottom on new messages
 */

import { useCallback, useRef, useEffect } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Stack, Text as TamaguiText, Spinner } from 'tamagui';
import { useTranslation } from '@/i18n';
import { MessageBubble, DateSeparator } from './MessageBubble';
import type { MessageWithSender, ConversationType } from '@/types/database';

export interface MessageListProps {
  /**
   * List of messages to display.
   */
  messages: MessageWithSender[];

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
   * Callback when a message is pressed.
   */
  onMessagePress?: (message: MessageWithSender) => void;

  /**
   * Callback when sender avatar is pressed.
   */
  onSenderPress?: (membershipId: string) => void;

  /**
   * Test ID for E2E testing.
   */
  testID?: string;
}

/**
 * Loading indicator for pagination (at the top).
 */
function LoadingMore() {
  return (
    <Stack testID="loading-more-messages" paddingVertical="$3" alignItems="center">
      <Spinner size="small" color="$primary" />
    </Stack>
  );
}

/**
 * Empty state for no messages.
 */
function EmptyMessages() {
  const { t } = useTranslation();

  return (
    <Stack
      testID="empty-messages"
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$3"
    >
      <TamaguiText fontSize={48}>💬</TamaguiText>
      <TamaguiText fontSize="$lg" fontWeight="600" color="$color1" textAlign="center">
        {t('chat.no_messages')}
      </TamaguiText>
      <TamaguiText fontSize="$md" color="$color2" textAlign="center">
        {t('chat.start_conversation')}
      </TamaguiText>
    </Stack>
  );
}

/**
 * Error state.
 */
function ErrorState({ error }: { error: Error }) {
  const { t } = useTranslation();

  return (
    <Stack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$3">
      <TamaguiText fontSize={48}>⚠️</TamaguiText>
      <TamaguiText fontSize="$lg" fontWeight="600" color="$danger" textAlign="center">
        {t('error')}
      </TamaguiText>
      <TamaguiText fontSize="$md" color="$color2" textAlign="center">
        {error.message}
      </TamaguiText>
    </Stack>
  );
}

/**
 * Message item wrapper with date separator.
 */
function MessageItem({
  item,
  previousItem,
  conversationType,
  currentUserId,
  onMessagePress,
  onSenderPress,
}: {
  item: MessageWithSender;
  previousItem?: MessageWithSender;
  conversationType: ConversationType;
  currentUserId: string;
  onMessagePress?: (message: MessageWithSender) => void;
  onSenderPress?: (membershipId: string) => void;
}) {
  const isOwnMessage = item.sender_id === currentUserId;

  return (
    <>
      <DateSeparator currentDate={item.created_at} previousDate={previousItem?.created_at} />
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        conversationType={conversationType}
        onPress={onMessagePress}
        onSenderPress={onSenderPress}
      />
    </>
  );
}

/**
 * MessageList component.
 */
export function MessageList({
  messages,
  loading,
  loadingMore = false,
  hasMore = false,
  error,
  conversationType,
  currentUserId,
  onLoadMore,
  onMessagePress,
  onSenderPress,
  testID,
}: MessageListProps) {
  const { t } = useTranslation();

  // Ref for FlatList to control scrolling
  const flatListRef = useRef<FlatList>(null);

  // Track if we're near bottom to auto-scroll on new messages
  const isNearBottomRef = useRef(true);

  // Initial scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      // Scroll to bottom after a short delay to ensure layout is complete
      const timeoutId = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, loading]);

  // Handle scroll events to track position
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100;

    // Check if near bottom
    isNearBottomRef.current =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  }, []);

  // Auto-scroll to bottom when new message arrives and we were at bottom
  const messagesLengthRef = useRef(messages.length);
  useEffect(() => {
    const prevLength = messagesLengthRef.current;
    const currentLength = messages.length;

    if (currentLength > prevLength && isNearBottomRef.current) {
      // New message arrived and we were near bottom, scroll to new message
      flatListRef.current?.scrollToEnd({ animated: true });
    }

    messagesLengthRef.current = currentLength;
  }, [messages.length]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<MessageWithSender>) => {
      const previousItem = index > 0 ? messages[index - 1] : undefined;
      return (
        <MessageItem
          item={item}
          previousItem={previousItem}
          conversationType={conversationType}
          currentUserId={currentUserId}
          onMessagePress={onMessagePress}
          onSenderPress={onSenderPress}
        />
      );
    },
    [conversationType, currentUserId, messages, onMessagePress, onSenderPress]
  );

  const keyExtractor = useCallback((item: MessageWithSender) => item.id, []);

  const ListHeaderComponent = useCallback(() => {
    if (loadingMore) {
      return <LoadingMore />;
    }
    return null;
  }, [loadingMore]);

  // Handle reaching start of list (for loading older messages)
  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, loadingMore, onLoadMore]);

  // Show loading state on initial load
  if (loading && messages.length === 0) {
    return (
      <Stack
        testID="messages-loading"
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$6"
        gap="$3"
      >
        <Spinner size="large" color="$primary" />
        <TamaguiText fontSize="$md" color="$color2">
          {t('chat.loading_messages')}
        </TamaguiText>
      </Stack>
    );
  }

  // Show error state
  if (error && messages.length === 0) {
    return <ErrorState error={error} />;
  }

  // Show empty state
  if (!loading && messages.length === 0) {
    return <EmptyMessages />;
  }

  return (
    <FlatList
      ref={flatListRef}
      testID={testID || 'message-list'}
      data={messages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      inverted // Messages flow from bottom to top (newest at bottom)
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      onScroll={handleScroll}
      scrollEventThrottle={400}
      contentContainerStyle={{
        flexGrow: 1,
        paddingVertical: 16,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    />
  );
}
