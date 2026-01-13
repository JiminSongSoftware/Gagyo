/**
 * GlassButton Component
 *
 * A button with Liquid Glass effect on iOS 26+.
 * Integrates with Tamagui Button while adding glass visual enhancements.
 *
 * Features:
 * - Runtime availability check for Liquid Glass
 * - Glass effect overlay on iOS 26+
 * - Progressive enhancement with fallback
 * - i18n integration via labelKey
 */

import { useState, useEffect } from 'react';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ButtonProps as TamaguiButtonProps } from 'tamagui';
import { Button as TamaguiButton, XStack, Spinner, Text, styled, useTheme } from 'tamagui';
import { useTranslation } from '@/i18n';

export interface GlassButtonProps extends Omit<TamaguiButtonProps, 'children'> {
  /**
   * The i18n translation key for the button label.
   */
  labelKey: string;

  /**
   * Optional parameters for interpolation in the translation string.
   */
  i18nParams?: Record<string, string | number | boolean>;

  /**
   * Visual variant of the glass button.
   */
  variant?: 'glass' | 'glass-prominent' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

  /**
   * Size variant of the button.
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether the button is in a loading state.
   */
  loading?: boolean;

  /**
   * Leading icon element to display before the label.
   */
  leadingIcon?: React.ReactNode;

  /**
   * Trailing icon element to display after the label.
   */
  trailingIcon?: React.ReactNode;

  /**
   * Intensity of the blur effect (fallback only).
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

const variantStyles = {
  'glass-prominent': {
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: '$color',
    hoverStyle: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
    pressStyle: { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  },
  glass: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: '$color',
    hoverStyle: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
    pressStyle: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  },
  primary: {
    backgroundColor: '$primary',
    color: '$color4',
    hoverStyle: { backgroundColor: '$primaryHover' },
    pressStyle: { backgroundColor: '$primaryActive' },
  },
  secondary: {
    backgroundColor: '$secondary',
    color: '$color4',
    hoverStyle: { backgroundColor: '$secondaryHover' },
    pressStyle: { backgroundColor: '$secondary' },
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '$border',
    color: '$color',
    hoverStyle: { backgroundColor: '$backgroundSecondary' },
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '$color',
    hoverStyle: { backgroundColor: '$backgroundSecondary' },
  },
  danger: {
    backgroundColor: '$danger',
    color: '$color4',
    hoverStyle: { backgroundColor: '$danger' },
    pressStyle: { opacity: 0.8 },
  },
} as const;

const sizeStyles = {
  sm: {
    minHeight: 32,
    px: '$3',
    fontSize: '$sm',
  },
  md: {
    minHeight: 40,
    px: '$4',
    fontSize: '$md',
  },
  lg: {
    minHeight: 48,
    px: '$5',
    fontSize: '$lg',
  },
} as const;

/**
 * Internal wrapper that provides glass effect.
 */
const GlassButtonWrapper = styled(TamaguiButton, {
  name: 'GlassButtonWrapper',
  position: 'relative',
  overflow: 'hidden',
});

/**
 * GlassButton component with Liquid Glass effect on iOS 26+.
 *
 * @example
 * ```tsx
 * <GlassButton labelKey="common.confirm" variant="glass" onPress={handleConfirm} />
 * <GlassButton labelKey="common.submit" variant="glass-prominent" size="lg" />
 * <GlassButton labelKey="common.cancel" variant="outline" />
 * ```
 */
export function GlassButton({
  labelKey,
  i18nParams,
  variant = 'glass',
  size = 'md',
  loading = false,
  disabled,
  leadingIcon,
  trailingIcon,
  intensity = 20,
  tint = 'default',
  glassEffectStyle = 'regular',
  style,
  ...props
}: GlassButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [liquidGlassAvailable, setLiquidGlassAvailable] = useState(false);

  useEffect(() => {
    setLiquidGlassAvailable(isLiquidGlassAvailable());
  }, []);

  const labelText = t(labelKey, i18nParams);
  const isDisabled = disabled || loading;
  const isGlassVariant = variant === 'glass' || variant === 'glass-prominent';

  const baseStyle: ViewStyle = {
    ...variantStyles[variant],
    ...sizeStyles[size],
    borderRadius: 12,
    fontWeight: '600',
    opacity: isDisabled ? 0.5 : 1,
  };

  const textColor =
    variant === 'outline' || variant === 'ghost' || isGlassVariant ? '$color' : '$color4';

  // Render glass effect overlay for glass variants
  const renderGlassEffect = () => {
    if (!isGlassVariant) return null;

    if (Platform.OS === 'ios' && liquidGlassAvailable) {
      return (
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle={glassEffectStyle}
          tintColor={variant === 'glass-prominent' ? undefined : tint === 'dark' ? '#00000000' : undefined}
          isInteractive={false}
        />
      );
    }

    return (
      <BlurView
        intensity={intensity}
        tint={tintMap[tint]}
        style={StyleSheet.absoluteFill}
      />
    );
  };

  return (
    <GlassButtonWrapper {...baseStyle} disabled={isDisabled} {...props} style={style}>
      {/* Glass effect overlay */}
      {renderGlassEffect()}

      {/* Button content */}
      <XStack
        gap="$2"
        alignItems="center"
        justifyContent="center"
        zIndex={1}
        style={StyleSheet.absoluteFillObject}
      >
        {loading ? (
          <Spinner
            size="small"
            color={textColor === '$color' ? theme.color.get() : theme.color4.get()}
          />
        ) : (
          leadingIcon
        )}
        {!loading && (
          <Text
            color={textColor === '$color' ? '$color' : '$color4'}
            style={{ textShadow: isGlassVariant ? '0 1px 2px rgba(0,0,0,0.1)' : undefined }}
          >
            {labelText}
          </Text>
        )}
        {!loading && trailingIcon}
      </XStack>
    </GlassButtonWrapper>
  );
}

/**
 * Glass button variant - standard glass effect.
 */
export const Glass = styled(GlassButton, {
  name: 'Glass',
  props: { variant: 'glass' as const },
});

/**
 * Prominent glass button variant - stronger glass effect.
 */
export const GlassProminent = styled(GlassButton, {
  name: 'GlassProminent',
  props: { variant: 'glass-prominent' as const },
});
