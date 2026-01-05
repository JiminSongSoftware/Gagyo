import type { SheetProps as TamaguiSheetProps } from 'tamagui';
import {
  Sheet as TamaguiSheet,
  SheetHandle,
  XStack,
  YStack,
  styled,
} from 'tamagui';
import { useTranslation } from '@/i18n';
import { Text } from './Text';
import { Button } from './Button';

export interface SheetProps extends Omit<TamaguiSheetProps, 'children'> {
  /**
   * i18n key for the sheet title.
   */
  titleKey?: string;

  /**
   * i18n key for the confirm button text.
   */
  confirmKey?: string;

  /**
   * i18n key for the cancel button text.
   */
  cancelKey?: string;

  /**
   * Snap points for the sheet.
   */
  snapPoints?: (number | string)[];

  /**
   * Whether to show the backdrop.
   */
  hasBackdrop?: boolean;

  /**
   * Callback when confirm is pressed.
   */
  onConfirm?: () => void;

  /**
   * Callback when cancel is pressed.
   */
  onCancel?: () => void;
}

/**
 * Sheet component - bottom sheet for mobile.
 *
 * @example
 * ```tsx
 * <Sheet
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   titleKey="common.filter"
 *   snapPoints={[25, 50, 75]}
 *   onCancel={() => setIsOpen(false)}
 * >
 *   <YStack p="$4" gap="$4">
 *     <Text i18nKey="common.filter_options" />
 *   </YStack>
 * </Sheet>
 * ```
 */
export function Sheet({
  titleKey,
  confirmKey,
  cancelKey = 'common.cancel',
  snapPoints = [80],
  hasBackdrop = true,
  onConfirm,
  onCancel,
  children,
  ...props
}: SheetProps) {
  const { t } = useTranslation();

  return (
    <TamaguiSheet
      snapPoints={snapPoints}
      dismissOnSnapToBottom
      dismissOnOverlayPress
      {...props}
    >
      <YStack fg={1} bg="$background" borderRadius="$4" borderBottomLeftRadius={0} borderBottomRightRadius={0}>
        {/* Handle */}
        <XStack width="100%" alignItems="center" py="$3">
          <SheetHandle />
        </XStack>

        {/* Header */}
        {titleKey && (
          <XStack px="$4" pb="$3" borderBottomWidth={1} borderBottomColor="$borderLight" alignItems="center" justifyContent="space-between">
            <Text i18nKey={titleKey} size="lg" weight="semibold" />
          </XStack>
        )}

        {/* Content */}
        <YStack fg={1} p="$4">
          {children}
        </YStack>

        {/* Footer Actions */}
        {(confirmKey || cancelKey) && (
          <XStack p="$4" gap="$3" borderTopWidth={1} borderTopColor="$borderLight">
            {cancelKey && onCancel && (
              <Button
                labelKey={cancelKey}
                variant="outline"
                flex={1}
                onPress={onCancel}
              />
            )}
            {confirmKey && onConfirm && (
              <Button
                labelKey={confirmKey}
                variant="primary"
                flex={1}
                onPress={onConfirm}
              />
            )}
          </XStack>
        )}
      </YStack>
    </TamaguiSheet>
  );
}

/**
 * Fullscreen sheet variant.
 */
export const FullscreenSheet = styled(Sheet, {
  name: 'FullscreenSheet',
  props: {
    snapPoints: [100],
    dismissOnOverlayPress: false,
  },
});

/**
 * Dialog sheet variant with fixed snap point.
 */
export const DialogSheet = styled(Sheet, {
  name: 'DialogSheet',
  props: {
    snapPoints: [50],
  },
});
