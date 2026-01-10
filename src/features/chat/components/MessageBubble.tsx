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
import { Pressable, View, StyleSheet, Image as RNImage } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { Stack, Text as TamaguiText, Image, XStack, YStack } from 'tamagui';
import { useTranslation } from '@/i18n';
import type { MessageWithSender } from '@/types/database';

/**
 * Pistos logo component for avatar fallback.
 * Derived from assets/pistos-logo.svg
 */
function PistosLogo({ width = 32, height = 32 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <G clipPath="url(#clip0_38_822)">
        <G clipPath="url(#clip1_38_822)">
          <Path
            d="M18.0158 3.11331L13.2982 4.53014L9.18207 8.04075V12.4802L10.8602 16.2427L15.2296 17.4076L20.1056 15.6444L22.7177 10.2132V1.90112L18.0158 3.11331Z"
            fill="#9CCA6B"
          />
          <Path
            d="M9.18207 12.6848L9.48287 7.33235L8.04223 6.70264L1.70978 5.41174L2.04223 10.5596L3.51453 14.2276L5.57258 16.1167L8.39052 16.8566L10.1478 15.8649L9.18207 12.6848Z"
            fill="#88BE51"
          />
          <Path
            d="M10.0528 23.4213C10.0211 22.0832 10.1636 20.7765 10.496 19.4856C10.6544 18.8717 10.8602 18.2577 11.0976 17.6595C12.3641 18.4781 13.7889 18.8717 15.2137 18.8717C17.4934 18.8717 19.7573 17.8484 21.2454 15.9121C25.4248 10.5123 23.5726 0.515747 23.5726 0.515747C23.5726 0.515747 13.8206 1.27139 9.48285 6.35627C6.18997 4.60883 1.86808 4.45141 0.474935 4.45141C0.189975 4.45141 0.0158325 4.45141 0.0158325 4.45141C0.0158325 4.46715 -0.474933 12.3542 3.24538 16.1482C4.40106 17.3289 5.93668 17.9271 7.4723 17.9271C7.9314 17.9271 8.3905 17.8799 8.83377 17.7697C8.70713 18.1632 8.58048 18.5411 8.48549 18.9346C8.08971 20.4459 7.91557 21.973 7.96306 23.5157L10.0528 23.437V23.4213ZM7.4723 15.8491C6.42744 15.8491 5.46174 15.4398 4.73351 14.6999C3.53034 13.4877 2.70713 11.3939 2.31135 8.68618C2.20053 7.93053 2.1372 7.22211 2.12137 6.60815C2.97625 6.67112 4.02111 6.79706 5.11346 7.01746C6.36412 7.28508 7.45647 7.64716 8.35884 8.1037C7.91557 9.04826 7.6781 10.0558 7.64644 11.0633C7.31399 10.6855 7.09235 10.4336 7.06069 10.4021C6.88655 10.1975 6.63325 10.0715 6.34829 10.0558C5.77837 10.0243 5.2876 10.4651 5.25594 11.0318C5.24011 11.3152 5.33509 11.5828 5.52507 11.7875C6.66491 13.0626 7.91557 14.5424 8.73879 15.6444C8.34301 15.7861 7.91557 15.8491 7.48813 15.8491H7.4723ZM10.8602 7.96202C12.6649 5.63211 15.9894 4.30972 18.4591 3.58556C19.6939 3.22348 20.8654 2.98734 21.7836 2.82992C21.8628 3.74299 21.9261 4.92369 21.9103 6.21458C21.8628 8.78063 21.4037 12.307 19.6148 14.6369C18.5541 16.0065 16.9551 16.7779 15.2296 16.7779C14.0581 16.7779 12.9499 16.4158 12.0158 15.7389C12.3166 15.1879 12.6649 14.6369 13.0449 14.1016C15.1187 11.1263 17.5567 9.44182 17.5884 9.42608C17.905 9.20569 18.095 8.81212 18.0317 8.40281C17.9367 7.83608 17.3984 7.45825 16.8285 7.55271C16.6702 7.58419 16.5277 7.63142 16.4169 7.72588C16.3061 7.80459 13.6939 9.59925 11.3826 12.858C11.0818 13.283 10.7968 13.7081 10.5435 14.1489C10.1478 13.5034 9.89446 12.7793 9.78364 12.0079C9.59367 10.5596 9.98945 9.11123 10.876 7.94627L10.8602 7.96202Z"
            fill="#968364"
          />
        </G>
      </G>
    </Svg>
  );
}

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
  // Extract URL from content (format: "filename|url")
  const imageUrl = content?.includes('|') ? content.split('|')[1] : content;
  // Check if still uploading (temp:// protocol)
  const isUploading = imageUrl?.startsWith('temp://');

  return (
    <Pressable onPress={onPress}>
      <Stack
        borderRadius="$2"
        overflow="hidden"
        maxWidth={200}
        maxHeight={200}
        backgroundColor="$backgroundTransparent"
      >
        {isUploading ? (
          <Stack
            width={200}
            height={200}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$backgroundTertiary"
          >
            <TamaguiText fontSize="$sm" color="$color3">
              ⏳ Uploading...
            </TamaguiText>
          </Stack>
        ) : imageUrl ? (
          <RNImage
            source={{ uri: imageUrl }}
            style={{ width: 200, height: 200 }}
            resizeMode="cover"
          />
        ) : (
          <Stack
            width={200}
            height={200}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$backgroundTertiary"
          >
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
  const { t } = useTranslation();

  return (
    <Stack
      borderWidth={1}
      borderColor="$borderLight"
      borderRadius="$3"
      padding="$3"
      backgroundColor={isOwnMessage ? '$chatBubbleOwn' : '$chatBubbleOther'}
      gap="$2"
    >
      <TamaguiText fontSize={14} fontWeight="600" color="$primary">
        🙏 {isOwnMessage ? t('chat.prayer_request') : t('chat.prayer_card')}
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

  // Show sender info only for others' messages
  const showSenderInfo = !isOwnMessage;

  // Get sender avatar URL
  const senderName = message.sender?.user?.display_name || 'Unknown';
  const senderAvatar = message.sender?.user?.photo_url;

  // Highlight styles for search results
  const highlightStyle = highlighted
    ? {
        borderWidth: 2,
        borderColor: '$primary' as const,
        borderRadius: '$3' as const,
        padding: '$1' as const,
      }
    : {};

  // Own messages: bubble on right, timestamp on left
  // Others' messages: profile + bubble on left, timestamp on right
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
      {/* Profile avatar */}
      {showSenderInfo ? (
        <Pressable onPress={handleSenderPress} disabled={!onSenderPress}>
          <Stack
            width={52}
            height={52}
            marginRight="$3"
            borderRadius={26}
            overflow="hidden"
            shadowColor="$shadowColor"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.15}
            shadowRadius={4}
            elevation={2}
          >
            {senderAvatar ? (
              <Image
                source={{ uri: senderAvatar }}
                style={{ width: 52, height: 52 }}
                resizeMode="cover"
              />
            ) : (
              <Stack
                width={52}
                height={52}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$backgroundTertiary"
              >
                <PistosLogo width={32} height={32} />
              </Stack>
            )}
          </Stack>
        </Pressable>
      ) : null}

      {/* Message content column */}
      <YStack flex={1} maxWidth="80%">
        {/* Sender name */}
        {showSenderInfo ? (
          <Pressable onPress={handleSenderPress} disabled={!onSenderPress}>
            <TamaguiText
              testID="sender-name"
              fontSize={14}
              fontWeight="600"
              color="$color3"
              marginBottom="$1"
            >
              {senderName}
            </TamaguiText>
          </Pressable>
        ) : null}

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
