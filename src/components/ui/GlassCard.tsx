/**
 * GlassCard Component
 *
 * A card container with Liquid Glass effect on iOS 26+.
 * Falls back to expo-blur on older iOS versions and Android.
 *
 * Features:
 * - Runtime availability check for Liquid Glass
 * - Progressive enhancement with fallback blur
 * - Tamagui integration for theming
 */

import { useState, useEffect } from 'react';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { StackProps } from 'tamagui';
import { Stack, styled, useTheme } from 'tamagui';

export interface GlassCardProps extends StackProps {
  /**
   * Visual variant of the glass card.
   */
  variant?: 'glass' | 'elevated' | 'outlined';

  /**
   * Padding variant for the card content.
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';

  /**
   * Intensity of the blur effect (fallback only).
   */
  intensity?: number;

  /**
   * Tint color for the glass effect.
   */
  tint?: 'light' | 'dark' | 'default';

  /**
   * Whether the card is pressable (interactive).
   */
  pressable?: boolean;

  /**
   * Whether to show hover effect on pressable cards.
   */
  hoverable?: boolean;

  /**
   * Glass effect style for Liquid Glass (iOS 26+).
   */
  glassEffectStyle?: 'clear' | 'regular';
}

const variantStyles = {
  glass: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  elevated: {
    backgroundColor: '$background',
    borderWidth: 0,
    shadowColor: '$shadowColor',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  outlined: {
    backgroundColor: '$background',
    borderWidth: 1,
    borderColor: '$border',
    shadowColor: 'transparent',
  },
} as const;

const paddingStyles = {
  none: { p: 0 },
  sm: { p: '$3' },
  md: { p: '$4' },
  lg: { p: '$5' },
} as const;

const tintMap = {
  light: 'light',
  dark: 'dark',
  default: Platform.select({ ios: 'default', android: 'light' }),
} as const;

/**
 * GlassCard component with Liquid Glass effect on iOS 26+.
 *
 * @example
 * ```tsx
 * <GlassCard variant="glass" padding="md">
 *   <Text i18nKey="common.title" />
 * </GlassCard>
 *
 * <GlassCard variant="glass" pressable onPress={handlePress}>
 *   <Text i18nKey="common.click_me" />
 * </GlassCard>
 * ```
 */
export function GlassCard({
  variant = 'glass',
  padding = 'md',
  intensity = 20,
  tint = 'default',
  pressable = false,
  hoverable = false,
  glassEffectStyle = 'regular',
  children,
  style,
  ...props
}: GlassCardProps) {
  const theme = useTheme();
  const [liquidGlassAvailable, setLiquidGlassAvailable] = useState(false);

  useEffect(() => {
    // Check Liquid Glass availability on mount
    setLiquidGlassAvailable(isLiquidGlassAvailable());
  }, []);

  const baseStyle: ViewStyle = {
    ...variantStyles[variant],
    ...paddingStyles[padding],
    borderRadius: 16,
    overflow: 'hidden',
    ...(pressable || hoverable
      ? {
          cursor: 'pointer',
          ...(hoverable && {
            hoverStyle: {
              backgroundColor: '$backgroundSecondary',
            },
          }),
        }
      : null),
  };

  const Wrapper = pressable ? styled(Stack, { name: 'PressableGlassCard' }) : Stack;

  // On iOS 26+ with Liquid Glass available, use GlassView
  if (Platform.OS === 'ios' && liquidGlassAvailable && variant === 'glass') {
    return (
      <Wrapper style={[baseStyle, style]} {...props}>
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle={glassEffectStyle}
          tintColor={tint === 'dark' ? '#00000000' : undefined}
          isInteractive={pressable}
        />
        <Stack style={StyleSheet.absoluteFill} zIndex={1}>
          {children}
        </Stack>
      </Wrapper>
    );
  }

  // Fallback to expo-blur for glass variant, or regular Card for other variants
  if (variant === 'glass') {
    return (
      <Wrapper style={[baseStyle, style]} {...props}>
        <BlurView
          intensity={intensity}
          tint={tintMap[tint]}
          style={StyleSheet.absoluteFill}
        />
        <Stack style={StyleSheet.absoluteFill} zIndex={1}>
          {children}
        </Stack>
      </Wrapper>
    );
  }

  // Non-glass variants use standard styling
  return (
    <Wrapper {...baseStyle} style={style} {...props}>
      {children}
    </Wrapper>
  );
}

/**
 * GlassCard.Header component for card header content.
 */
export const GlassCardHeader = styled(Stack, {
  name: 'GlassCardHeader',
  pb: '$3',
  borderBottomWidth: 1,
  borderBottomColor: '$borderLight',
});

/**
 * GlassCard.Body component for card main content.
 */
export const GlassCardBody = styled(Stack, {
  name: 'GlassCardBody',
  flex: 1,
  gap: '$2',
});

/**
 * GlassCard.Footer component for card footer content.
 */
export const GlassCardFooter = styled(Stack, {
  name: 'GlassCardFooter',
  pt: '$3',
  borderTopWidth: 1,
  borderTopColor: '$borderLight',
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'flex-end' as const,
  gap: '$2',
});

// Attach sub-components to GlassCard
GlassCard.Header = GlassCardHeader;
GlassCard.Body = GlassCardBody;
GlassCard.Footer = GlassCardFooter;
