/**
 * AlertDialog Component
 *
 * A testable confirmation dialog component for E2E testing.
 * Uses absolute positioning overlay pattern like CreatePrayerCardModal.
 *
 * Features:
 * - testID for Detox/E2E testing
 * - Title, message, confirm/cancel buttons
 * - i18n support
 * - Accessible with proper hit slops
 *
 * @example
 * ```tsx
 * <AlertDialog
 *   visible={showDialog}
 *   titleKey="pastoral.confirm_submit_title"
 *   messageKey="pastoral.confirm_submit_message"
 *   confirmTextKey="common.confirm"
 *   cancelTextKey="common.cancel"
 *   testID="submit-confirmation-dialog"
 *   onConfirm={() => handleConfirm()}
 *   onCancel={() => setShowDialog(false)}
 * />
 * ```
 */

import { Stack, Text as TamaguiText, XStack, YStack, Button, styled } from 'tamagui';
import { useTranslation } from '@/i18n';

// ============================================================================
// TYPES
// ============================================================================

export interface AlertDialogProps {
  /**
   * Whether the dialog is visible.
   */
  visible: boolean;

  /**
   * i18n key for the dialog title.
   */
  titleKey: string;

  /**
   * i18n key for the dialog message.
   */
  messageKey: string;

  /**
   * i18n key for confirm button text.
   */
  confirmTextKey?: string;

  /**
   * i18n key for cancel button text.
   */
  cancelTextKey?: string;

  /**
   * Test ID for E2E testing (e.g., "submit-confirmation-dialog").
   */
  testID: string;

  /**
   * Callback when confirm is pressed.
   */
  onConfirm: () => void | Promise<void>;

  /**
   * Callback when cancel is pressed.
   */
  onCancel: () => void | Promise<void>;

  /**
   * Whether the dialog is in a loading state.
   */
  loading?: boolean;

  /**
   * Whether to disable the confirm button.
   */
  confirmDisabled?: boolean;

  /**
   * Optional custom title text (overrides titleKey).
   */
  title?: string;

  /**
   * Optional custom message text (overrides messageKey).
   */
  message?: string;

  /**
   * Optional custom confirm button text (overrides confirmTextKey).
   */
  confirmText?: string;

  /**
   * Optional custom cancel button text (overrides cancelTextKey).
   */
  cancelText?: string;

  /**
   * Variant for confirm button.
   */
  variant?: 'primary' | 'danger';
}

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const DialogOverlay = styled(Stack, {
  name: 'DialogOverlay',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 2000,
});

const DialogContent = styled(Stack, {
  name: 'DialogContent',
  backgroundColor: '$background',
  borderRadius: '$4',
  width: '85%',
  maxWidth: 400,
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 8,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AlertDialog({
  visible,
  titleKey,
  messageKey,
  confirmTextKey = 'common.confirm',
  cancelTextKey = 'common.cancel',
  testID,
  onConfirm,
  onCancel,
  loading = false,
  confirmDisabled = false,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'primary',
}: AlertDialogProps) {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  const confirmButtonColor = variant === 'danger' ? '$error' : '$primary';

  return (
    <DialogOverlay testID={testID} onStartShouldSetResponder={() => true}>
      <DialogContent>
        <YStack padding="$4" gap="$4">
          {/* Title */}
          <TamaguiText testID={`${testID}-title`} fontSize="$lg" fontWeight="bold" color="$color">
            {title || t(titleKey)}
          </TamaguiText>

          {/* Message */}
          <TamaguiText testID={`${testID}-message`} fontSize="$md" color="$color" lineHeight="$4">
            {message || t(messageKey)}
          </TamaguiText>

          {/* Actions */}
          <XStack gap="$3" marginTop="$2">
            <Button
              testID={`${testID}-cancel-button`}
              flex={1}
              size="$4"
              backgroundColor="$backgroundTertiary"
              color="$color"
              onPress={onCancel}
              disabled={loading}
            >
              <TamaguiText>{cancelText || t(cancelTextKey)}</TamaguiText>
            </Button>

            <Button
              testID={`${testID}-confirm-button`}
              flex={1}
              size="$4"
              backgroundColor={confirmButtonColor}
              color="white"
              onPress={onConfirm}
              disabled={loading || confirmDisabled}
            >
              <TamaguiText color="white">{confirmText || t(confirmTextKey)}</TamaguiText>
            </Button>
          </XStack>
        </YStack>
      </DialogContent>
    </DialogOverlay>
  );
}

AlertDialog.displayName = 'AlertDialog';
