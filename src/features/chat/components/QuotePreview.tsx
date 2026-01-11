/**
 * QuotePreview Component
 *
 * Displays a quoted message preview above the composer.
 * Shows sender avatar, name, and truncated message content with a close button.
 *
 * Used when user selects "Quote in reply" from message action menu.
 */

import { useCallback, memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Stack, Text as TamaguiText, XStack, YStack, Image } from 'tamagui';
import { X } from '@phosphor-icons/react';
import { PistosLogo } from './MessageBubble';
import { useTranslation } from 'react-i18next';

export interface QuotePreviewProps {
  /**
   * Sender display name.
   */
  senderName: string;

  /**
   * Sender avatar URL (optional).
   */
  senderAvatar?: string | null;

  /**
   * Quoted message content (truncated).
   */
  content: string;

  /**
   * Callback when close button is pressed.
   */
  onRemove: () => void;
}

const MAX_CONTENT_LENGTH = 80;

/**
 * Truncate message content for preview.
 */
function truncateContent(content: string): string {
  if (content.length <= MAX_CONTENT_LENGTH) {
    return content;
  }
  return content.substring(0, MAX_CONTENT_LENGTH) + '...';
}

/**
 * Quote preview component.
 */
export const QuotePreview = memo(
  ({ senderName, senderAvatar, content, onRemove }: QuotePreviewProps) => {
    const { t } = useTranslation();

    const handleRemove = useCallback(() => {
      onRemove();
    }, [onRemove]);

    const truncatedContent = truncateContent(content);

    return (
      <Stack
        style={styles.container}
        backgroundColor="$backgroundTertiary"
        borderRadius="$2"
        padding="$2"
        marginBottom="$2"
      >
        <XStack alignItems="center" gap="$2" flex={1}>
          {/* Sender avatar */}
          <Stack
            width={28}
            height={28}
            borderRadius={14}
            overflow="hidden"
            backgroundColor="$backgroundStrong"
          >
            {senderAvatar ? (
              <Image
                source={{ uri: senderAvatar }}
                style={{ width: 28, height: 28 }}
                resizeMode="cover"
              />
            ) : (
              <Stack alignItems="center" justifyContent="center" flex={1}>
                <PistosLogo width={18} height={18} />
              </Stack>
            )}
          </Stack>

          {/* Sender name and content */}
          <YStack flex={1} gap="$0.5">
            <TamaguiText fontSize="$xs" fontWeight="600" color="$color2">
              {senderName}
            </TamaguiText>
            <TamaguiText fontSize="$xs" color="$color3" numberOfLines={2}>
              {truncatedContent}
            </TamaguiText>
          </YStack>

          {/* Close button */}
          <Pressable
            onPress={handleRemove}
            style={styles.closeButton}
            hitSlop={4}
            accessibilityLabel={t('chat.quote_preview.remove_quote')}
            accessibilityRole="button"
          >
            <X size={20} color="$color3" />
          </Pressable>
        </XStack>
      </Stack>
    );
  }
);

QuotePreview.displayName = 'QuotePreview';

const styles = StyleSheet.create({
  container: {
    marginLeft: 16,
    marginRight: 16,
    marginTop: 8,
  },
  closeButton: {
    padding: 4,
  },
});
