/**
 * GlassSheet Component
 *
 * A modal/sheet wrapper with Liquid Glass effect on iOS 26+.
 * Uses native iOS form sheet presentation when available.
 * Falls back to standard modal/sheet on other platforms.
 *
 * Features:
 * - Runtime availability check for Liquid Glass
 * - Native iOS form sheet presentation on iOS 26+
 * - Progressive enhancement with fallback
 * - Tamagui integration for theming
 */

import { useState, useEffect, useCallback } from 'react';
import { Modal, Pressable, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { SheetProps as TamaguiSheetProps } from 'tamagui';
import {
  Sheet as TamaguiSheet,
  SheetHandle,
  XStack,
  YStack,
  styled,
  useTheme,
} from 'tamagui';
import { useTranslation } from '@/i18n';
import { Text } from './Text';
import { Button } from './Button';

export interface GlassSheetProps extends Omit<TamaguiSheetProps, 'children'> {
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
   * Snap points for the sheet (fallback mode).
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

  /**
   * Whether to use native form sheet presentation on iOS 26+.
   */
  useFormSheet?: boolean;

  /**
   * Intensity of the blur effect for fallback.
   */
  intensity?: number;

  /**
   * Tint color for the glass effect.
   */
  tint?: 'light' | 'dark' | 'default';

  /**
   * Glass effect style for Liquid Glass (iOS 26+).
   */
  glassEffectStyle?: 'clear' | 'regular';
}

const tintMap = {
  light: 'light',
  dark: 'dark',
  default: Platform.select({ ios: 'default', android: 'light' }),
} as const;

/**
 * GlassSheet component with Liquid Glass effect on iOS 26+.
 *
 * @example
 * ```tsx
 * <GlassSheet
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   titleKey="common.filter"
 *   onCancel={() => setIsOpen(false)}
 *   useFormSheet={true}
 * >
 *   <YStack p="$4" gap="$4">
 *     <Text i18nKey="common.filter_options" />
 *   </YStack>
 * </GlassSheet>
 * ```
 */
export function GlassSheet({
  titleKey,
  confirmKey,
  cancelKey = 'common.cancel',
  snapPoints = [80],
  hasBackdrop = true,
  onConfirm,
  onCancel,
  useFormSheet = true,
  intensity = 20,
  tint = 'dark',
  glassEffectStyle = 'regular',
  open,
  onOpenChange,
  children,
  ...props
}: GlassSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [liquidGlassAvailable, setLiquidGlassAvailable] = useState(false);

  useEffect(() => {
    setLiquidGlassAvailable(isLiquidGlassAvailable());
  }, []);

  const handleBackdropPress = useCallback(() => {
    onOpenChange?.(false);
    onCancel?.();
  }, [onOpenChange, onCancel]);

  const handleConfirm = useCallback(() => {
    onConfirm?.();
  }, [onConfirm]);

  // iOS 26+ with Liquid Glass and useFormSheet - use enhanced modal presentation
  const shouldUseGlassModal =
    Platform.OS === 'ios' &&
    liquidGlassAvailable &&
    useFormSheet &&
    open;

  if (shouldUseGlassModal) {
    return (
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={handleBackdropPress}
        statusBarTranslucent
      >
        {/* Backdrop with glass effect */}
        {hasBackdrop && (
          <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
            <GlassView
              style={StyleSheet.absoluteFill}
              glassEffectStyle={glassEffectStyle}
              tintColor={tint === 'dark' ? '#00000000' : undefined}
            />
          </Pressable>
        )}

        {/* Sheet container */}
        <YStack style={styles.sheetContainer} pointerEvents="box-none">
          <YStack
            style={styles.glassSheet}
            backgroundColor={theme.background.get()}
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            pb="$safe-area-bottom"
          >
            {/* Glass effect overlay */}
            <GlassView
              style={StyleSheet.absoluteFill}
              glassEffectStyle={glassEffectStyle}
              tintColor={tint === 'dark' ? '#00000000' : undefined}
            />

            {/* Content */}
            <YStack zIndex={1} style={StyleSheet.absoluteFillObject}>
              {/* Drag handle */}
              <XStack alignItems="center" pt="$3" pb="$2">
                <View style={styles.dragHandle} />
              </XStack>

              {/* Header */}
              {titleKey && (
                <XStack
                  px="$4"
                  pb="$3"
                  borderBottomWidth={1}
                  borderBottomColor="$borderLight"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Text i18nKey={titleKey} size="lg" weight="semibold" />
                </XStack>
              )}

              {/* Content */}
              <YStack fg={1} p="$4">
                {children}
              </YStack>

              {/* Footer Actions */}
              {(confirmKey || cancelKey) && (
                <XStack
                  p="$4"
                  gap="$3"
                  borderTopWidth={1}
                  borderTopColor="$borderLight"
                >
                  {cancelKey && onCancel && (
                    <Button
                      labelKey={cancelKey}
                      variant="outline"
                      flex={1}
                      onPress={handleBackdropPress}
                    />
                  )}
                  {confirmKey && onConfirm && (
                    <Button
                      labelKey={confirmKey}
                      variant="primary"
                      flex={1}
                      onPress={handleConfirm}
                    />
                  )}
                </XStack>
              )}
            </YStack>
          </YStack>
        </YStack>
      </Modal>
    );
  }

  // Fallback to Tamagui Sheet with expo-blur
  return (
    <TamaguiSheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
      dismissOnSnapToBottom
      dismissOnOverlayPress
      {...props}
    >
      <YStack
        fg={1}
        bg="$background"
        borderRadius="$4"
        borderBottomLeftRadius={0}
        borderBottomRightRadius={0}
      >
        {/* Fallback blur overlay */}
        {hasBackdrop && Platform.OS === 'ios' && (
          <BlurView intensity={intensity} tint={tintMap[tint]} style={StyleSheet.absoluteFill} />
        )}

        {/* Handle */}
        <XStack width="100%" alignItems="center" py="$3" zIndex={1}>
          <SheetHandle />
        </XStack>

        {/* Header */}
        {titleKey && (
          <XStack
            px="$4"
            pb="$3"
            borderBottomWidth={1}
            borderBottomColor="$borderLight"
            alignItems="center"
            justifyContent="space-between"
            zIndex={1}
          >
            <Text i18nKey={titleKey} size="lg" weight="semibold" />
          </XStack>
        )}

        {/* Content */}
        <YStack fg={1} p="$4" zIndex={1}>
          {children}
        </YStack>

        {/* Footer Actions */}
        {(confirmKey || cancelKey) && (
          <XStack
            p="$4"
            gap="$3"
            borderTopWidth={1}
            borderTopColor="$borderLight"
            zIndex={1}
          >
            {cancelKey && onCancel && (
              <Button
                labelKey={cancelKey}
                variant="outline"
                flex={1}
                onPress={handleBackdropPress}
              />
            )}
            {confirmKey && onConfirm && (
              <Button
                labelKey={confirmKey}
                variant="primary"
                flex={1}
                onPress={handleConfirm}
              />
            )}
          </XStack>
        )}
      </YStack>
    </TamaguiSheet>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  sheetContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  glassSheet: {
    marginHorizontal: 0,
    marginBottom: 0,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    ...StyleSheet.shadow,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CCCCCC',
    borderRadius: 2,
  },
});

/**
 * Fullscreen sheet variant.
 */
export const FullscreenGlassSheet = styled(GlassSheet, {
  name: 'FullscreenGlassSheet',
  props: {
    snapPoints: [100],
    dismissOnOverlayPress: false,
  },
});

/**
 * Dialog sheet variant with fixed snap point.
 */
export const DialogGlassSheet = styled(GlassSheet, {
  name: 'DialogGlassSheet',
  props: {
    snapPoints: [50],
  },
});
