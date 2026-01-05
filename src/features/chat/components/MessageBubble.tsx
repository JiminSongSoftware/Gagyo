/**
 * Message bubble component.
 *
 * Displays a single message with:
 * - Sender name and avatar (for group chats)
 * - Message content based on content type (text, image, prayer_card, system)
 * - Timestamp
 * - Different styling for own messages vs others
 * - Thread reply count indicator
 */

import { useCallback } from 'react';
import { Pressable, ViewStyle } from 'react-native';
import { Stack, Text as TamaguiText, Image } from 'tamagui';
import { useTranslation } from '@/i18n';
import type { MessageWithSender, ConversationType } from '@/types/database';

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
  conversationType: ConversationType;

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
 * Get background color based on conversation type.
 */
function getBackgroundColor(isOwnMessage: boolean, conversationType: ConversationType): string {
  if (isOwnMessage) {
    return '$primary';
  }

  // Different background colors for different conversation types
  switch (conversationType) {
    case 'small_group':
      return '$backgroundWarm';
    case 'ministry':
      return '$backgroundCool';
    case 'church_wide':
      return '$backgroundAccent';
    default:
      return '$backgroundTertiary';
  }
}

/**
 * Get text color based on message ownership.
 */
function getTextColor(isOwnMessage: boolean): string {
  return isOwnMessage ? 'white' : '$color1';
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
      borderColor={isOwnMessage ? '$primary' : '$borderLight'}
      borderRadius="$3"
      padding="$3"
      backgroundColor={isOwnMessage ? '$primary' : '$background'}
      gap="$2"
    >
      <TamaguiText fontSize="$sm" fontWeight="600" color={isOwnMessage ? 'white' : '$primary'}>
        🙏 {isOwnMessage ? 'Prayer Request' : 'Prayer Card'}
      </TamaguiText>
      <TamaguiText fontSize="$md" color={isOwnMessage ? 'white' : '$color1'} lineHeight="$4">
        {content || ''}
      </TamaguiText>
    </Stack>
  );
}

/**
 * MessageBubble component.
 */
export function MessageBubble({
  message,
  isOwnMessage,
  conversationType,
  onPress,
  onSenderPress,
  showThreadIndicator = true,
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

  const backgroundColor = getBackgroundColor(isOwnMessage, conversationType);
  const textColor = getTextColor(isOwnMessage);
  const isDirectMessage = conversationType === 'direct';

  // Show sender info for group chats when not own message
  const showSenderInfo = !isOwnMessage && !isDirectMessage;

  // Determine bubble alignment
  const alignmentStyle: ViewStyle = isOwnMessage
    ? { alignSelf: 'flex-end' }
    : { alignSelf: 'flex-start' };

  return (
    <Stack
      testID={testID || `message-${message.id}`}
      style={alignmentStyle}
      maxWidth="80%"
      marginBottom="$2"
    >
      {/* Sender info for group chats */}
      {showSenderInfo && (
        <Pressable onPress={handleSenderPress} disabled={!onSenderPress}>
          <TamaguiText
            testID="sender-name"
            fontSize="$xs"
            fontWeight="600"
            color="$color3"
            marginLeft="$1"
            marginBottom="$1"
          >
            {message.sender?.user?.display_name || 'Unknown'}
          </TamaguiText>
        </Pressable>
      )}

      {/* Message bubble */}
      <Pressable onPress={handlePress}>
        <Stack borderRadius="$3" padding="$3" backgroundColor={backgroundColor} gap="$2">
          {/* Message content based on type */}
          {message.content_type === 'image' && (
            <ImageMessage content={message.content} onPress={handlePress} />
          )}

          {message.content_type === 'prayer_card' && (
            <PrayerCardMessage content={message.content} isOwnMessage={isOwnMessage} />
          )}

          {message.content_type === 'text' && (
            <TamaguiText testID="message-content" fontSize="$md" color={textColor} lineHeight="$5">
              {message.content || ''}
            </TamaguiText>
          )}

          {/* Timestamp and reply count */}
          <Stack
            flexDirection="row"
            alignItems="center"
            gap="$2"
            alignSelf={isOwnMessage ? 'flex-end' : 'flex-start'}
          >
            <TamaguiText
              testID="message-timestamp"
              fontSize="$xs"
              color={isOwnMessage ? '$primaryLight' : '$color3'}
            >
              {formatMessageTime(message.created_at)}
            </TamaguiText>

            {/* Thread reply count indicator */}
            {showThreadIndicator && message.reply_count && message.reply_count > 0 && (
              <Stack
                testID="reply-count-badge"
                flexDirection="row"
                alignItems="center"
                gap="$1"
                backgroundColor={isOwnMessage ? '$primaryDark' : '$backgroundTertiary'}
                borderRadius={8}
                paddingHorizontal="$2"
                paddingVertical="$1"
              >
                <TamaguiText testID="reply-count-text" fontSize="$xs" color={isOwnMessage ? 'white' : '$color2'}>
                  {message.reply_count}
                </TamaguiText>
              </Stack>
            )}

            {/* Event Chat indicator (only for sender) */}
            {message.is_event_chat && isOwnMessage && (
              <TamaguiText fontSize="$xs" color={isOwnMessage ? '$primaryLight' : '$color3'}>
                👁️
              </TamaguiText>
            )}
          </Stack>
        </Stack>
      </Pressable>
    </Stack>
  );
}

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
