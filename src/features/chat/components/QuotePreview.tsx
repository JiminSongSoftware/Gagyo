/**
 * QuotePreview component.
 *
 * Displays a quoted message preview above the composer.
 * Shows sender avatar, name, message preview, and close button.
 *
 * Used when user selects "Quote in reply" from message actions.
 */

import { useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from '@/i18n';
import { Stack, XStack, YStack, Text, Image } from 'tamagui';
import { X } from '@phosphor-icons/react';
import type { MessageWithSender } from '@/types/database';

export interface QuotePreviewProps {
  /**
   * The message being quoted.
   */
  message: MessageWithSender;

  /**
   * Callback when user taps close button.
   */
  onRemove: () => void;

  /**
   * Test ID for E2E testing.
   */
  testID?: string;
}

/**
 * Truncate text to specified length with ellipsis.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * QuotePreview component.
 */
export function QuotePreview({ message, onRemove, testID }: QuotePreviewProps) {
  const { t } = useTranslation();

  // Generate avatar URL from sender_id (using a placeholder pattern)
  // In production, this would use the actual avatar URL from the sender profile
  const avatarUrl = useMemo(() => {
    // For now, use a deterministic gradient pattern based on sender_id
    // This should be replaced with actual avatar URL when sender profiles are implemented
    return null; // Will use fallback InitialsAvatar
  }, []);

  // Get sender display name
  const senderName: string = message.sender?.display_name || t('common.unknown_user');

  // Generate preview text (first 100 characters)
  const previewText = useMemo(() => {
    return truncateText(message.content || '', 100);
  }, [message.content]);

  const handleRemove = useCallback(() => {
    onRemove();
  }, [onRemove]);

  return (
    <YStack
      testID={testID || 'quote-preview'}
      style={styles.container}
      backgroundColor="$background"
      borderBottomWidth={1}
      borderBottomColor="$border3"
    >
      {/* Left border accent */}
      <View style={styles.accentBorder} />

      <XStack style={styles.content} gap="$3">
        {/* Avatar */}
        <Stack
          width={32}
          height={32}
          borderRadius={16}
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Text fontSize={14} fontWeight="600" color="white">
              {senderName.charAt(0).toUpperCase()}
            </Text>
          )}
        </Stack>

        {/* Quote content */}
        <YStack flex={1} justifyContent="center" gap="$1">
          <Text fontSize="$xs" fontWeight="600" color="$color3">
            {senderName}
          </Text>
          <Text fontSize="$sm" color="$color2" numberOfLines={2} ellipsizeMode="tail">
            {previewText}
          </Text>
        </YStack>

        {/* Close button */}
        <Pressable
          testID={`${testID || 'quote-preview'}-remove-button`}
          onPress={handleRemove}
          hitSlop={8}
          style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <X size={20} weight="bold" color="$color3" />
        </Pressable>
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  accentBorder: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    backgroundColor: '#6366F1', // Primary color indigo-500
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  content: {
    marginLeft: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  closeButton: {
    padding: 4,
  },
});
