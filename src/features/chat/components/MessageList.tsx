/**
 * Message list component.
 *
 * Displays a list of messages with:
 * - ScrollView with newest at bottom (traditional chat view)
 * - Date separators between days
 * - Loading indicator at bottom for pagination
 * - Empty state
 * - Error state
 * - Auto-scroll to bottom on new messages
 *
 * Note: Uses ScrollView instead of FlatList for better NativeTabs integration.
 * Per Expo docs: "FlatList integration with native tabs has limitations.
 * Features like scroll-to-top and minimize-on-scroll aren't supported."
 */

import { useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import { Stack, Text as TamaguiText, Spinner } from 'tamagui';
import { useTranslation } from '@/i18n';
import { MessageBubble, DateSeparator } from './MessageBubble';
import { useChatStore } from '../store/chatStore';
import type { MessageWithSender, ConversationType } from '@/types/database';

export interface MessageListHandle {
  scrollToMessage: (messageId: string) => void;
  /**
   * Scroll to top to trigger native tab minimization when keyboard appears.
   */
  scrollToTop: () => void;
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

  const messageBubble = (
    <MessageBubble
      message={item}
      isOwnMessage={isOwnMessage}
      conversationType={conversationType}
      onPress={onMessagePress}
      onSenderPress={onSenderPress}
      showThreadIndicator={showThreadIndicator}
      highlighted={isHighlighted}
    />
  );

  return (
    <>
      <DateSeparator currentDate={item.created_at} previousDate={previousItem?.created_at} />
      {isDimmed ? (
        <BlurView intensity={5} tint="default" style={{ flex: 1 }}>
          {messageBubble}
        </BlurView>
      ) : (
        messageBubble
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
    const selectedMessageId = useChatStore((s) => s.selectedMessage?.id);

    // Ref for ScrollView to control scrolling
    const scrollViewRef = useRef<ScrollView>(null);

    // Track if we're near bottom to auto-scroll on new messages
    const isNearBottomRef = useRef(true);

    // Track if scroll is programmatic (to prevent pagination during scrollToTop)
    const isProgrammaticScrollRef = useRef(false);

    // Track current scroll position to preserve during programmatic scrolls
    const currentScrollYRef = useRef(0);

    // Initial scroll to bottom when messages load
    useEffect(() => {
      if (messages.length > 0 && !loading) {
        // Scroll to bottom after a short delay to ensure layout is complete
        const timeoutId = setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }, [messages.length, loading]);

    // Handle scroll events to track position
    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const paddingToBottom = 100;
        const paddingToTop = 100;

        // Track current scroll position
        currentScrollYRef.current = contentOffset.y;

        // Check if near bottom
        const nearBottom =
          layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
        isNearBottomRef.current = nearBottom;

        // Check if near top (for pagination)
        const nearTop = contentOffset.y <= paddingToTop;
        setIsNearTop(nearTop);

        // Load more messages when near top, but skip if this is a programmatic scroll
        // (e.g., tab minimization scroll that should not trigger pagination)
        if (nearTop && hasMore && !loadingMore && onLoadMore && !isProgrammaticScrollRef.current) {
          onLoadMore();
        }
      },
      [hasMore, loadingMore, onLoadMore]
    );

    // Auto-scroll to bottom when new message arrives and we were at bottom
    const messagesLengthRef = useRef(messages.length);
    useEffect(() => {
      const prevLength = messagesLengthRef.current;
      const currentLength = messages.length;

      if (currentLength > prevLength && isNearBottomRef.current) {
        // New message arrived and we were near bottom, scroll to new message
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }

      messagesLengthRef.current = currentLength;
    }, [messages.length]);

    // Expose scrollToMessage and scrollToTop functions via ref
    useImperativeHandle(
      ref,
      () => ({
        scrollToMessage: (messageId: string) => {
          // For ScrollView, we need to find the message and calculate position
          // This is a simplified version - for precise positioning, you'd need
          // to measure the actual position of the message element
          const index = messages.findIndex((msg) => msg.id === messageId);
          if (index !== -1 && scrollViewRef.current) {
            // Scroll to approximately the right position
            // Each message is roughly 60px tall on average
            const approximatePosition = index * 60;
            scrollViewRef.current.scrollTo({ y: approximatePosition, animated: true });
          }
        },
        scrollToTop: () => {
          // Trigger native tab minimization by scrolling DOWN from current position
          // ScrollView with NativeTabs uses minimizeBehavior="onScrollDown"
          // This means tabs minimize when scrolling DOWN (increasing y position)
          const scrollView = scrollViewRef.current;
          if (!scrollView) return;

          // Capture the current scroll position to preserve reader's place
          const originalY = currentScrollYRef.current;

          // Mark as programmatic scroll to prevent pagination
          isProgrammaticScrollRef.current = true;

          // Apply a small downward scroll (40-60px) from current position
          // This triggers the minimize behavior without jumping to top
          // We add the small offset to the current position to scroll down
          const downwardScrollY = originalY + 50;

          requestAnimationFrame(() => {
            scrollView.scrollTo({ y: downwardScrollY, animated: false });

            // Return to the original position after the minimization gesture
            requestAnimationFrame(() => {
              // Use Math.max to ensure we don't go below 0
              const returnY = Math.max(originalY, 10); // Keep at least 10px to stay out of pagination zone
              scrollView.scrollTo({ y: returnY, animated: true });

              // Reset the programmatic flag after scroll completes
              setTimeout(() => {
                isProgrammaticScrollRef.current = false;
              }, 500);
            });
          });
        },
      }),
      [messages]
    );

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
      <ScrollView
        ref={scrollViewRef}
        testID={testID || 'message-list'}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 16,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((item, index) => {
          const previousItem = index > 0 ? messages[index - 1] : undefined;
          return (
            <MessageItem
              key={item.id}
              item={item}
              previousItem={previousItem}
              conversationType={conversationType}
              currentUserId={currentUserId}
              onMessagePress={onMessagePress}
              onSenderPress={onSenderPress}
              showThreadIndicator={showThreadIndicators}
              highlightedMessageId={highlightedMessageId}
              selectedMessageId={selectedMessageId}
            />
          );
        })}

        {/* Loading indicator at bottom */}
        {loadingMore && <LoadingMore />}

        {/* Extra space at bottom for scrollability */}
        <Stack height={100} />
      </ScrollView>
    );
  }
);

MessageList.displayName = 'MessageList';
