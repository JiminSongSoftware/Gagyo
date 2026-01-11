/**
 * Message list component.
 *
 * Displays a paginated list of messages with:
 * - FlatList with newest at bottom (traditional chat view)
 * - Date separators between days
 * - Loading indicator at bottom for pagination
 * - Empty state
 * - Error state
 * - Auto-scroll to bottom on new messages
 */

import { useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Stack, Text as TamaguiText, Spinner } from 'tamagui';
import { useTranslation } from '@/i18n';
import { MessageBubble, DateSeparator } from './MessageBubble';
import { useChatStore } from '../store/chatStore';
import type { MessageWithSender, ConversationType } from '@/types/database';

export interface MessageListHandle {
  scrollToMessage: (messageId: string) => void;
}

export interface MessageListProps {
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
   * Callback when a message is pressed.
   */
  onMessagePress?: (message: MessageWithSender) => void;

  /**
   * Callback when sender avatar is pressed.
   */
  onSenderPress?: (membershipId: string) => void;

  /**
   * Whether to show thread indicators on messages. Default: true.
   * Set to false in thread views where replies can't have threads.
   */
  showThreadIndicators?: boolean;

  /**
   * Test ID for E2E testing.
   */
  testID?: string;
}

/**
 * Loading indicator for pagination (at the bottom).
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
  showThreadIndicator,
  highlightedMessageId,
  selectedMessageId,
}: {
  item: MessageWithSender;
  previousItem?: MessageWithSender;
  conversationType: ConversationType;
  currentUserId: string;
  onMessagePress?: (message: MessageWithSender) => void;
  onSenderPress?: (membershipId: string) => void;
  showThreadIndicator: boolean;
  highlightedMessageId?: string | null;
  selectedMessageId?: string | null;
}) {
  const isOwnMessage = item.sender_id === currentUserId;
  const isHighlighted = item.id === highlightedMessageId;
  const isSelected = item.id === selectedMessageId;
  const isDimmed = selectedMessageId && !isSelected;

  return (
    <>
      <DateSeparator currentDate={item.created_at} previousDate={previousItem?.created_at} />
      {isDimmed ? (
        <BlurView intensity={5} tint="default" style={{ flex: 1 }}>
          <MessageBubble
            message={item}
            isOwnMessage={isOwnMessage}
            conversationType={conversationType}
            onPress={onMessagePress}
            onSenderPress={onSenderPress}
            showThreadIndicator={showThreadIndicator}
            highlighted={isHighlighted}
          />
        </BlurView>
      ) : (
        <MessageBubble
          message={item}
          isOwnMessage={isOwnMessage}
          conversationType={conversationType}
          onPress={onMessagePress}
          onSenderPress={onSenderPress}
          showThreadIndicator={showThreadIndicator}
          highlighted={isHighlighted}
        />
      )}
    </>
  );
}

/**
 * MessageList component.
 */
export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  (
    {
      messages,
      highlightedMessageId,
      loading,
      loadingMore = false,
      hasMore = false,
      error,
      conversationType,
      currentUserId,
      onLoadMore,
      onMessagePress,
      onSenderPress,
      showThreadIndicators = true,
      testID,
    }: MessageListProps,
    ref
  ) => {
    const { t } = useTranslation();
    const { selectedMessage } = useChatStore();

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

      // Check if near bottom (for non-inverted list)
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

    // Expose scrollToMessage function via ref
    useImperativeHandle(
      ref,
      () => ({
        scrollToMessage: (messageId: string) => {
          const index = messages.findIndex((msg) => msg.id === messageId);
          if (index !== -1) {
            flatListRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.5,
            });
          }
        },
      }),
      [messages]
    );

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
            showThreadIndicator={showThreadIndicators}
            highlightedMessageId={highlightedMessageId}
            selectedMessageId={selectedMessage?.id}
          />
        );
      },
      [
        conversationType,
        currentUserId,
        messages,
        onMessagePress,
        onSenderPress,
        showThreadIndicators,
        highlightedMessageId,
        selectedMessage,
      ]
    );

    const keyExtractor = useCallback((item: MessageWithSender) => item.id, []);

    const ListFooterComponent = useCallback(() => {
      if (loadingMore) {
        return <LoadingMore />;
      }
      return null;
    }, [loadingMore]);

    // Handle reaching end of list (for loading older messages)
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
        ListFooterComponent={ListFooterComponent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingVertical: 16,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    );
  }
);

MessageList.displayName = 'MessageList';
