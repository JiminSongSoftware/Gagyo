import type { TextProps as TamaguiTextProps } from 'tamagui';
import { Text as TamaguiText, useTheme } from 'tamagui';
import { useTranslation } from '@/i18n';

export interface TextProps extends Omit<TamaguiTextProps, 'children'> {
  /**
   * The i18n translation key. This component does NOT accept children directly.
   * All text content must be provided through translations.
   */
  i18nKey: string;

  /**
   * Optional parameters for interpolation in the translation string.
   */
  i18nParams?: Record<string, string | number | boolean>;

  /**
   * Text variant for common patterns.
   */
  variant?: 'body' | 'caption' | 'label';

  /**
   * Size variant for responsive text sizing.
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Weight variant for text emphasis.
   */
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';

  /**
   * Color variant using theme tokens.
   */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
}

const variantStyles = {
  body: {
    fontSize: '$md',
    lineHeight: 24,
  },
  caption: {
    fontSize: '$sm',
    lineHeight: 16,
  },
  label: {
    fontSize: '$sm',
    fontWeight: '600',
    lineHeight: 20,
  },
} as const;

const sizeStyles = {
  sm: {
    fontSize: '$sm',
    lineHeight: 16,
  },
  md: {
    fontSize: '$md',
    lineHeight: 24,
  },
  lg: {
    fontSize: '$lg',
    lineHeight: 28,
  },
} as const;

const weightStyles = {
  regular: {
    fontWeight: '400',
  },
  medium: {
    fontWeight: '500',
  },
  semibold: {
    fontWeight: '600',
  },
  bold: {
    fontWeight: '700',
  },
} as const;

const colorMap = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  muted: 'color2',
} as const;

/**
 * Text component with enforced i18n integration.
 *
 * This component does NOT accept children - all text must come from translations
 * via the `i18nKey` prop. This prevents hardcoded strings and ensures all text
 * is internationalized.
 *
 * @example
 * ```tsx
 * <Text i18nKey="common.confirm" />
 * <Text i18nKey="common.welcome" i18nParams={{ name: 'John' }} />
 * <Text i18nKey="common.submit" variant="label" />
 * <Text i18nKey="errors.network_error" color="danger" />
 * ```
 */
export function Text({
  i18nKey,
  i18nParams,
  variant = 'body',
  size,
  weight,
  color,
  style,
  ...props
}: TextProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const translatedText = t(i18nKey, i18nParams);

  // Build style object from variants
  const styleFromVariants: any = {
    ...variantStyles[variant],
    ...(size && sizeStyles[size]),
    ...(weight && weightStyles[weight]),
  };

  // Apply color from theme tokens if specified
  if (color && colorMap[color]) {
    styleFromVariants.color = theme[colorMap[color]].val;
  }

  return (
    <TamaguiText style={[styleFromVariants, style]} {...props}>
      {translatedText}
    </TamaguiText>
  );
}
