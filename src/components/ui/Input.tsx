import type { InputProps as TamaguiInputProps, TextAreaProps as TamaguiTextAreaProps } from 'tamagui';
import {
  Input as TamaguiInput,
  XStack,
  useTheme,
  styled,
} from 'tamagui';
import { useTranslation } from '@/i18n';
import { Text } from './Text';

export interface InputProps extends Omit<TamaguiInputProps, 'placeholder'> {
  /**
   * The i18n translation key for the placeholder text.
   */
  placeholderKey?: string;

  /**
   * Optional i18n key for the label text.
   */
  labelKey?: string;

  /**
   * Optional i18n key for helper text displayed below the input.
   */
  helperTextKey?: string;

  /**
   * Optional i18n key for error text displayed when there's an error.
   */
  errorTextKey?: string;

  /**
   * Visual variant of the input.
   */
  variant?: 'default' | 'filled' | 'outline';

  /**
   * Size variant of the input.
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether the input is in an error state.
   */
  error?: boolean;

  /**
   * Whether the input is in a success state.
   */
  success?: boolean;

  /**
   * Leading icon element to display inside the input.
   */
  leadingIcon?: React.ReactNode;

  /**
   * Trailing icon element to display inside the input.
   */
  trailingIcon?: React.ReactNode;
}

const variantStyles = {
  default: {
    backgroundColor: '$background',
    borderWidth: 1,
    borderColor: '$border',
  },
  filled: {
    backgroundColor: '$backgroundSecondary',
    borderWidth: 0,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '$border',
  },
} as const;

const sizeStyles = {
  sm: {
    minHeight: 32,
    fontSize: '$sm',
    px: '$3',
  },
  md: {
    minHeight: 40,
    fontSize: '$md',
    px: '$4',
  },
  lg: {
    minHeight: 48,
    fontSize: '$lg',
    px: '$4',
  },
} as const;

const stateBorderColor = {
  error: '$danger',
  success: '$success',
} as const;

/**
 * Input component with enforced i18n integration.
 *
 * Placeholders, labels, and helper/error text must come from translations.
 *
 * @example
 * ```tsx
 * <Input
 *   placeholderKey="auth.email_placeholder"
 *   labelKey="auth.email_label"
 *   value={email}
 *   onChangeText={setEmail}
 * />
 *
 * <Input
 *   placeholderKey="auth.password_placeholder"
 *   labelKey="auth.password_label"
 *   errorTextKey={hasError ? 'auth.password_error' : undefined}
 *   secureTextEntry
 *   value={password}
 *   onChangeText={setPassword}
 * />
 * ```
 */
export function Input({
  placeholderKey,
  labelKey,
  helperTextKey,
  errorTextKey,
  variant = 'default',
  size = 'md',
  error = false,
  success = false,
  leadingIcon,
  trailingIcon,
  style,
  ...props
}: InputProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const placeholderText = placeholderKey ? t(placeholderKey) : undefined;
  const labelText = labelKey ? t(labelKey) : undefined;
  const helperText = helperTextKey ? t(helperTextKey) : undefined;
  const errorText = errorTextKey ? t(errorTextKey) : undefined;

  const borderColor = error
    ? stateBorderColor.error
    : success
      ? stateBorderColor.success
      : variantStyles[variant].borderColor;

  const baseStyle = {
    ...variantStyles[variant],
    ...sizeStyles[size],
    borderRadius: '$3',
    color: '$color',
    borderColor,
    focusStyle: {
      borderColor: error ? '$danger' : '$primary',
      borderWidth: 2,
    },
  };

  return (
    <XStack width="100%" flexDirection="column" gap="$1">
      {labelText && (
        <Text i18nKey={labelKey} variant="label" color="muted" />
      )}

      <XStack position="relative" alignItems="center">
        {leadingIcon && (
          <XStack position="absolute" left={size === 'sm' ? '$3' : size === 'lg' ? '$4' : '$3.5'} zIndex={1}>
            {leadingIcon}
          </XStack>
        )}

        <TamaguiInput
          {...baseStyle}
          pl={leadingIcon ? '$6' : undefined}
          pr={trailingIcon ? '$6' : undefined}
          placeholder={placeholderText}
          style={style}
          {...props}
        />

        {trailingIcon && (
          <XStack position="absolute" right={size === 'sm' ? '$3' : size === 'lg' ? '$4' : '$3.5'} zIndex={1}>
            {trailingIcon}
          </XStack>
        )}
      </XStack>

      {(helperText || errorText) && (
        <XStack justifyContent="space-between" alignItems="center">
          {helperText && !error && (
            <Text i18nKey={helperTextKey!} variant="caption" color="muted" flex={1} />
          )}
          {errorText && (
            <Text i18nKey={errorTextKey!} variant="caption" color="danger" flex={1} />
          )}
        </XStack>
      )}
    </XStack>
  );
}

/**
 * Text input with focus state styling.
 */
export const TextInput = styled(Input, {
  name: 'TextInput',
});
