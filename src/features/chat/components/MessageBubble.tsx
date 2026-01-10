/**
 * Message bubble component.
 *
 * Displays a single message with KakaoTalk-style design:
 * - Sender profile image and name (for group chats, others' messages)
 * - Message content based on content type (text, image, prayer_card, system)
 * - Timestamp displayed outside the bubble
 * - Gold (#FFD700) bubbles for own messages, white for others
 * - Bubble tail pointing toward sender
 * - Thread reply count indicator
 * - Highlight support for search results
 */

import { useCallback } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Stack, Text as TamaguiText, Image, Avatar, XStack, YStack } from 'tamagui';
import { useTranslation } from '@/i18n';
import type { MessageWithSender } from '@/types/database';

export interface MessageBubbleProps {
  /**
   * The message data to display.
   */
  message: MessageWithSender;

  /**
   * Whether this message was sent by the current user.
   */
  isOwnMessage: boolean;

  /**
   * The conversation type (affects display behavior).
   */
  conversationType: 'direct' | 'small_group' | 'ministry' | 'church_wide';

  /**
   * Callback when the message is pressed (for thread view or image expansion).
   */
  onPress?: (message: MessageWithSender) => void;

  /**
   * Callback when the sender avatar is pressed.
   */
  onSenderPress?: (membershipId: string) => void;

  /**
   * Whether to show the thread indicator badge. Default: true.
   * Set to false in thread views where replies don't have threads.
   */
  showThreadIndicator?: boolean;

  /**
   * Whether to highlight this message (e.g., from search results).
   */
  highlighted?: boolean;

  /**
   * Test ID for E2E testing.
   */
  testID?: string;
}

/**
 * Format timestamp for message display.
 * Returns time in HH:MM format.
 */
function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Check if two messages are from the same day.
 */
function isSameDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Get bubble background color (KakaoTalk style).
 * Own messages: Gold (#FFD700)
 * Others' messages: White
 */
function getBubbleBackgroundColor(isOwnMessage: boolean): string {
  return isOwnMessage ? '$chatBubbleOwn' : '$chatBubbleOther';
}

/**
 * Get text color based on message ownership.
 * Both use dark text for readability on gold/white backgrounds.
 */
function getTextColor(_isOwnMessage: boolean): string {
  return '$color1';
}

/**
 * Render system message (centered, muted).
 */
function SystemMessage({ content }: { content: string | null }) {
  return (
    <Stack alignItems="center" paddingVertical="$2" paddingHorizontal="$4" width="100%">
      <TamaguiText fontSize="$xs" color="$color3" textAlign="center">
        {content || ''}
      </TamaguiText>
    </Stack>
  );
}

/**
 * Render image message.
 */
function ImageMessage({ content, onPress }: { content: string | null; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Stack
        borderRadius="$2"
        overflow="hidden"
        maxWidth={200}
        maxHeight={200}
        backgroundColor="$backgroundTertiary"
      >
        {content ? (
          <Image source={{ uri: content }} style={{ width: 200, height: 200 }} resizeMode="cover" />
        ) : (
          <Stack width={200} height={200} alignItems="center" justifyContent="center">
            <TamaguiText fontSize="$lg">📷</TamaguiText>
          </Stack>
        )}
      </Stack>
    </Pressable>
  );
}

/**
 * Render prayer card message.
 */
function PrayerCardMessage({
  content,
  isOwnMessage,
}: {
  content: string | null;
  isOwnMessage: boolean;
}) {
  return (
    <Stack
      borderWidth={1}
      borderColor="$borderLight"
      borderRadius="$3"
      padding="$3"
      backgroundColor={isOwnMessage ? '$chatBubbleOwn' : '$chatBubbleOther'}
      gap="$2"
    >
      <TamaguiText fontSize="$sm" fontWeight="600" color="$primary">
        🙏 {isOwnMessage ? 'Prayer Request' : 'Prayer Card'}
      </TamaguiText>
      <TamaguiText fontSize="$lg" color="$color1" lineHeight="$5">
        {content || ''}
      </TamaguiText>
    </Stack>
  );
}

/**
 * Render message content based on type.
 * Returns a single element to avoid whitespace issues between siblings.
 */
function MessageContentView({
  contentType,
  content,
  isOwnMessage,
  textColor,
  handlePress,
}: {
  contentType: string;
  content: string | null;
  isOwnMessage: boolean;
  textColor: string;
  handlePress: () => void;
}) {
  // Render content based on type - text uses larger font size per KakaoTalk style
  return (
    <Stack>
      {contentType === 'image' ? (
        <ImageMessage content={content} onPress={handlePress} />
      ) : contentType === 'prayer_card' ? (
        <PrayerCardMessage content={content} isOwnMessage={isOwnMessage} />
      ) : (
        <TamaguiText testID="message-content" fontSize="$lg" color={textColor} lineHeight="$6">
          {content || ''}
        </TamaguiText>
      )}
    </Stack>
  );
}

/**
 * Bubble tail component for KakaoTalk-style chat bubbles.
 */
function BubbleTail({ isOwnMessage }: { isOwnMessage: boolean }) {
  return (
    <View
      style={[
        bubbleStyles.tail,
        isOwnMessage ? bubbleStyles.tailRight : bubbleStyles.tailLeft,
        { borderBottomColor: isOwnMessage ? '#FFD700' : '#FFFFFF' },
      ]}
    />
  );
}

/**
 * MessageBubble component with KakaoTalk-style design.
 */
export function MessageBubble({
  message,
  isOwnMessage,
  conversationType: _conversationType,
  onPress,
  onSenderPress,
  showThreadIndicator = true,
  highlighted = false,
  testID,
}: MessageBubbleProps) {
  const handlePress = useCallback(() => {
    onPress?.(message);
  }, [message, onPress]);

  const handleSenderPress = useCallback(() => {
    if (message.sender?.id) {
      onSenderPress?.(message.sender.id);
    }
  }, [message, onSenderPress]);

  // System messages are centered and don't have bubbles
  if (message.content_type === 'system') {
    return <SystemMessage content={message.content} />;
  }

  const bubbleBackgroundColor = getBubbleBackgroundColor(isOwnMessage);
  const textColor = getTextColor(isOwnMessage);

  // Show sender info (profile + name) for all messages from others
  const showSenderInfo = !isOwnMessage;

  // Get sender avatar URL or generate initials
  const senderName = message.sender?.user?.display_name || 'Unknown';
  const senderAvatar = message.sender?.user?.photo_url;
  const senderInitials = senderName.charAt(0).toUpperCase();

  // Highlight styles for search results
  const highlightStyle = highlighted
    ? {
        borderWidth: 2,
        borderColor: '$primary' as const,
        borderRadius: '$3' as const,
        padding: '$1' as const,
      }
    : {};

  // Own messages: bubble on right, timestamp on left of bubble
  // Others' messages: profile + bubble on left, timestamp on right of bubble
  if (isOwnMessage) {
    return (
      <XStack
        testID={testID || `message-${message.id}`}
        justifyContent="flex-end"
        alignItems="flex-end"
        marginHorizontal="$3"
        marginBottom="$2"
        maxWidth="100%"
        {...highlightStyle}
      >
        {/* Timestamp and metadata on left of bubble */}
        <YStack alignItems="flex-end" justifyContent="flex-end" marginRight="$1.5" gap="$0.5">
          {/* Reply count badge */}
          {showThreadIndicator && message.reply_count && message.reply_count > 0 ? (
            <Stack
              testID="reply-count-badge"
              flexDirection="row"
              alignItems="center"
              gap="$1"
              backgroundColor="$backgroundTertiary"
              borderRadius={8}
              paddingHorizontal="$1.5"
              paddingVertical="$0.5"
            >
              <TamaguiText testID="reply-count-text" fontSize={10} color="$color2">
                {message.reply_count}
              </TamaguiText>
            </Stack>
          ) : null}
          {/* Event chat indicator */}
          {message.is_event_chat ? (
            <TamaguiText fontSize={10} color="$color3">
              👁️
            </TamaguiText>
          ) : null}
          {/* Timestamp */}
          <TamaguiText testID="message-timestamp" fontSize={11} color="$color3">
            {formatMessageTime(message.created_at)}
          </TamaguiText>
        </YStack>

        {/* Message bubble */}
        <Pressable onPress={handlePress}>
          <View style={bubbleStyles.bubbleWrapper}>
            <Stack
              borderRadius={16}
              borderTopRightRadius={4}
              padding="$2.5"
              paddingHorizontal="$3"
              backgroundColor={bubbleBackgroundColor}
              maxWidth={260}
              shadowColor="$shadowColor"
              shadowOffset={{ width: 0, height: 1 }}
              shadowOpacity={0.1}
              shadowRadius={2}
              elevation={1}
            >
              <MessageContentView
                contentType={message.content_type}
                content={message.content}
                isOwnMessage={isOwnMessage}
                textColor={textColor}
                handlePress={handlePress}
              />
            </Stack>
            <BubbleTail isOwnMessage={true} />
          </View>
        </Pressable>
      </XStack>
    );
  }

  // Others' messages layout
  return (
    <XStack
      testID={testID || `message-${message.id}`}
      justifyContent="flex-start"
      alignItems="flex-start"
      marginHorizontal="$3"
      marginBottom="$2"
      maxWidth="100%"
      {...highlightStyle}
    >
      {/* Profile avatar for group chats */}
      {showSenderInfo ? (
        <Pressable onPress={handleSenderPress} disabled={!onSenderPress}>
          <Avatar circular size="$3" marginRight="$2">
            {senderAvatar ? (
              <Avatar.Image accessibilityLabel={senderName} src={senderAvatar} />
            ) : (
              <Avatar.Fallback backgroundColor="$backgroundTertiary">
                <TamaguiText fontSize="$sm" fontWeight="600" color="$color2">
                  {senderInitials}
                </TamaguiText>
              </Avatar.Fallback>
            )}
          </Avatar>
        </Pressable>
      ) : (
        // Spacer for direct messages to maintain alignment
        <Stack width="$3" marginRight="$2" />
      )}

      {/* Message content column */}
      <YStack flex={1} maxWidth="80%">
        {/* Sender name for group chats */}
        {showSenderInfo && (
          <Pressable onPress={handleSenderPress} disabled={!onSenderPress}>
            <TamaguiText
              testID="sender-name"
              fontSize="$xs"
              fontWeight="600"
              color="$color3"
              marginBottom="$1"
            >
              {senderName}
            </TamaguiText>
          </Pressable>
        )}

        {/* Bubble and timestamp row */}
        <XStack alignItems="flex-end">
          {/* Message bubble */}
          <Pressable onPress={handlePress}>
            <View style={bubbleStyles.bubbleWrapper}>
              <BubbleTail isOwnMessage={false} />
              <Stack
                borderRadius={16}
                borderTopLeftRadius={4}
                padding="$2.5"
                paddingHorizontal="$3"
                backgroundColor={bubbleBackgroundColor}
                maxWidth={260}
                shadowColor="$shadowColor"
                shadowOffset={{ width: 0, height: 1 }}
                shadowOpacity={0.1}
                shadowRadius={2}
                elevation={1}
              >
                <MessageContentView
                  contentType={message.content_type}
                  content={message.content}
                  isOwnMessage={isOwnMessage}
                  textColor={textColor}
                  handlePress={handlePress}
                />
              </Stack>
            </View>
          </Pressable>

          {/* Timestamp and metadata on right of bubble */}
          <YStack alignItems="flex-start" justifyContent="flex-end" marginLeft="$1.5" gap="$0.5">
            {/* Reply count badge */}
            {showThreadIndicator && message.reply_count && message.reply_count > 0 ? (
              <Stack
                testID="reply-count-badge"
                flexDirection="row"
                alignItems="center"
                gap="$1"
                backgroundColor="$backgroundTertiary"
                borderRadius={8}
                paddingHorizontal="$1.5"
                paddingVertical="$0.5"
              >
                <TamaguiText testID="reply-count-text" fontSize={10} color="$color2">
                  {message.reply_count}
                </TamaguiText>
              </Stack>
            ) : null}
            {/* Timestamp */}
            <TamaguiText testID="message-timestamp" fontSize={11} color="$color3">
              {formatMessageTime(message.created_at)}
            </TamaguiText>
          </YStack>
        </XStack>
      </YStack>
    </XStack>
  );
}

/**
 * Styles for bubble tail.
 */
const bubbleStyles = StyleSheet.create({
  bubbleWrapper: {
    position: 'relative',
  },
  tail: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tailLeft: {
    left: -6,
    transform: [{ rotate: '-45deg' }],
  },
  tailRight: {
    right: -6,
    transform: [{ rotate: '45deg' }],
  },
});

/**
 * Date separator component.
 * Displays a centered date separator between messages from different days.
 */
export interface DateSeparatorProps {
  currentDate: string;
  previousDate?: string;
}

export function DateSeparator({ currentDate, previousDate }: DateSeparatorProps) {
  const { t } = useTranslation();

  // Don't render if same day as previous
  if (previousDate && isSameDay(currentDate, previousDate)) {
    return null;
  }

  const date = new Date(currentDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayDate = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate()
  );
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  let dateText: string;

  if (messageDate.getTime() === todayDate.getTime()) {
    dateText = t('chat.today');
  } else if (messageDate.getTime() === yesterdayDate.getTime()) {
    dateText = t('chat.yesterday');
  } else {
    dateText = date.toLocaleDateString();
  }

  return (
    <Stack testID={`date-separator-${currentDate}`} alignItems="center" paddingVertical="$3">
      <Stack
        backgroundColor="$backgroundTertiary"
        borderRadius={12}
        paddingHorizontal="$3"
        paddingVertical="$1"
      >
        <TamaguiText fontSize="$xs" fontWeight="500" color="$color3">
          {dateText}
        </TamaguiText>
      </Stack>
    </Stack>
  );
}
