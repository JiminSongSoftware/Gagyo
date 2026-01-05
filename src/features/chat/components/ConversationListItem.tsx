/**
 * Conversation list item component.
 *
 * Displays a single conversation in the chat list with:
 * - Conversation name/title
 * - Last message preview (truncated)
 * - Timestamp of last message
 * - Unread count badge
 */

import { useCallback } from 'react';
import { Pressable } from 'react-native';
import { Stack, Text as TamaguiText, useTheme } from 'tamagui';
import { useTranslation } from '@/i18n';
import type { ConversationWithLastMessage, ConversationType } from '@/types/database';

export interface ConversationListItemProps {
  /**
   * The conversation data to display.
   */
  conversation: ConversationWithLastMessage;

  /**
   * Callback when the conversation is pressed.
   */
  onPress: (conversationId: string) => void;

  /**
   * Test ID for E2E testing.
   */
  testID?: string;
}

/**
 * Format timestamp for display.
 * Returns "Today", "Yesterday", or formatted date.
 */
function formatTimestamp(dateString: string, t: (key: string) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (messageDate.getTime() === today.getTime()) {
    return t('chat.today');
  }

  if (messageDate.getTime() === yesterday.getTime()) {
    return t('chat.yesterday');
  }

  // Format as MM/DD or localized date
  return date.toLocaleDateString();
}

/**
 * Get display name for a conversation based on type.
 */
function getConversationDisplayName(
  conversation: ConversationWithLastMessage
): string {
  if (conversation.name) {
    return conversation.name;
  }

  // For direct messages, show participant names
  if (
    conversation.conversation_type === 'direct' &&
    conversation.participant_names?.length
  ) {
    return conversation.participant_names.join(', ');
  }

  return 'Conversation';
}

/**
 * Get last message preview text.
 */
function getLastMessagePreview(
  conversation: ConversationWithLastMessage
): string | null {
  if (!conversation.last_message) {
    return null;
  }

  const { content, content_type, sender } = conversation.last_message;

  // Handle non-text message types
  if (content_type === 'image') {
    return '📷 Image';
  }
  if (content_type === 'prayer_card') {
    return '🙏 Prayer Card';
  }
  if (content_type === 'system') {
    return content || 'System message';
  }

  // Truncate long messages
  const maxLength = 50;
  const text = content || '';
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...';
  }

  return text;
}

/**
 * ConversationListItem component.
 */
export function ConversationListItem({
  conversation,
  onPress,
  testID,
}: ConversationListItemProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const handlePress = useCallback(() => {
    onPress(conversation.id);
  }, [conversation.id, onPress]);

  const displayName = getConversationDisplayName(conversation);
  const lastMessagePreview = getLastMessagePreview(conversation);
  const timestamp = conversation.last_message
    ? formatTimestamp(conversation.last_message.created_at, t)
    : null;
  const hasUnread = conversation.unread_count > 0;

  // Generate testID based on conversation name
  const itemTestID =
    testID ||
    `conversation-item-${displayName.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <Pressable
      onPress={handlePress}
      testID={itemTestID}
      accessibilityRole="button"
      accessibilityLabel={`${displayName} conversation`}
    >
      <Stack
        flexDirection="row"
        alignItems="center"
        paddingHorizontal="$4"
        paddingVertical="$3"
        backgroundColor={hasUnread ? '$primaryLight' : 'transparent'}
        borderBottomWidth={1}
        borderBottomColor="$borderLight"
        gap="$3"
      >
        {/* Avatar placeholder */}
        <Stack
          width={48}
          height={48}
          borderRadius={24}
          backgroundColor="$backgroundTertiary"
          alignItems="center"
          justifyContent="center"
        >
          <TamaguiText
            fontSize="$lg"
            fontWeight="600"
            color="$color2"
          >
            {displayName.charAt(0).toUpperCase()}
          </TamaguiText>
        </Stack>

        {/* Content */}
        <Stack flex={1} gap="$1">
          {/* Header row: name + timestamp */}
          <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
            <TamaguiText
              fontSize="$md"
              fontWeight={hasUnread ? '700' : '500'}
              color="$color1"
              numberOfLines={1}
              flex={1}
            >
              {displayName}
            </TamaguiText>

            {timestamp && (
              <TamaguiText
                fontSize="$sm"
                color="$color3"
                marginLeft="$2"
              >
                {timestamp}
              </TamaguiText>
            )}
          </Stack>

          {/* Last message preview */}
          {lastMessagePreview && (
            <Stack flexDirection="row" alignItems="center" gap="$2">
              <TamaguiText
                testID="last-message-preview"
                fontSize="$sm"
                color={hasUnread ? '$color1' : '$color2'}
                fontWeight={hasUnread ? '500' : '400'}
                numberOfLines={1}
                flex={1}
              >
                {lastMessagePreview}
              </TamaguiText>

              {/* Unread badge */}
              {hasUnread && (
                <Stack
                  testID="unread-badge"
                  backgroundColor="$primary"
                  borderRadius={12}
                  minWidth={24}
                  height={24}
                  alignItems="center"
                  justifyContent="center"
                  paddingHorizontal="$2"
                >
                  <TamaguiText
                    fontSize="$xs"
                    fontWeight="700"
                    color="white"
                  >
                    {conversation.unread_count > 99
                      ? '99+'
                      : conversation.unread_count}
                  </TamaguiText>
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Pressable>
  );
}
