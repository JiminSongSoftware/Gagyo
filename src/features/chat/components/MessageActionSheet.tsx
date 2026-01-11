/**
 * MessageActionSheet Component
 *
 * Bottom sheet that appears when a message is tapped.
 * Shows three options: Reply in thread, Quote in reply, Copy text.
 *
 * Features:
 * - Blur overlay on background
 * - Three action items with Phosphor icons
 * - Dismissible via tap outside or drag down
 */

import { useCallback, memo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text as TamaguiText, YStack, XStack, useTheme } from 'tamagui';
import { useTranslation } from '@/i18n';
import {
  ChatCircle,
  ArrowUUpLeft,
  Copy,
} from '@phosphor-icons/react';
import type { MessageWithSender } from '@/types/database';

export interface MessageActionSheetProps {
  /**
   * The message that was tapped.
   */
  message: MessageWithSender;

  /**
   * Whether the sheet is visible.
   */
  visible: boolean;

  /**
   * Callback when sheet should be dismissed.
   */
  onDismiss: () => void;

  /**
   * Callback when "Reply in thread" is selected.
   */
  onReplyInThread: (message: MessageWithSender) => void;

  /**
   * Callback when "Quote in reply" is selected.
   */
  onQuoteInReply: (message: MessageWithSender) => void;

  /**
   * Callback when "Copy text" is selected.
   */
  onCopyText: (message: MessageWithSender) => void;

  /**
   * Number of replies if the message has an existing thread.
   */
  replyCount?: number | null;
}

const ACTION_ITEM_HEIGHT = 56;

/**
 * Individual action item in the sheet.
 */
const ActionItem = memo(({
  icon: Icon,
  label,
  onPress,
}: {
  icon: React.ElementType;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.actionItem,
      pressed && styles.actionItemPressed,
    ]}
    accessibilityLabel={label}
    accessibilityRole="button"
  >
    <XStack alignItems="center" flex={1} gap="$3">
      <Icon size={24} color="$color1" />
      <TamaguiText fontSize="$4" color="$color1">
        {label}
      </TamaguiText>
    </XStack>
  </Pressable>
));

ActionItem.displayName = 'ActionItem';

/**
 * Message action sheet component.
 */
export const MessageActionSheet = memo(({
  message,
  visible,
  onDismiss,
  onReplyInThread,
  onQuoteInReply,
  onCopyText,
  replyCount,
}: MessageActionSheetProps) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const handleReplyInThread = useCallback(() => {
    onReplyInThread(message);
    onDismiss();
  }, [message, onReplyInThread, onDismiss]);

  const handleQuoteInReply = useCallback(() => {
    onQuoteInReply(message);
    onDismiss();
  }, [message, onQuoteInReply, onDismiss]);

  const handleCopyText = useCallback(() => {
    onCopyText(message);
    onDismiss();
  }, [message, onCopyText, onDismiss]);

  const handleBackdropPress = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  // Get reply count label for thread option
  const replyInThreadLabel = replyCount && replyCount > 0
    ? t('chat.message.replyInThreadWithCount', { count: replyCount })
    : t('chat.message.replyInThread');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop with blur */}
      <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
        <BlurView intensity={20} tint="dark" style={styles.backdropBlur} />
      </Pressable>

      {/* Bottom sheet */}
      <Pressable style={styles.sheetContainer} pointerEvents="box-none">
        <YStack style={styles.sheet} backgroundColor={theme.background.get()} pb="$safe-area-bottom">
          {/* Drag handle */}
          <XStack justifyContent="center" pt="$3" pb="$2">
            <View style={styles.dragHandle} />
          </XStack>

          {/* Action items */}
          <YStack>
            <ActionItem
              icon={ChatCircle}
              label={replyInThreadLabel}
              onPress={handleReplyInThread}
            />
            <ActionItem
              icon={ArrowUUpLeft}
              label={t('chat.message.quoteInReply')}
              onPress={handleQuoteInReply}
            />
            <ActionItem
              icon={Copy}
              label={t('chat.message.copyText')}
              onPress={handleCopyText}
            />
          </YStack>
        </YStack>
      </Pressable>
    </Modal>
  );
});

MessageActionSheet.displayName = 'MessageActionSheet';

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backdropBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    ...StyleSheet.shadow,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CCCCCC',
    borderRadius: 2,
  },
  actionItem: {
    height: ACTION_ITEM_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  actionItemPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});
