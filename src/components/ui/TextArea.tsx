import type { TextAreaProps as TamaguiTextAreaProps } from 'tamagui';
import {
  TextArea as TamaguiTextArea,
  XStack,
  styled,
} from 'tamagui';
import { useTranslation } from '@/i18n';
import { Text } from './Text';

export interface TextAreaProps extends Omit<TamaguiTextAreaProps, 'placeholder'> {
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
   * Visual variant of the textarea.
   */
  variant?: 'default' | 'filled' | 'outline';

  /**
   * Size variant of the textarea.
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether the textarea is in an error state.
   */
  error?: boolean;

  /**
   * Whether the textarea is in a success state.
   */
  success?: boolean;

  /**
   * Maximum number of characters allowed.
   */
  maxLength?: number;

  /**
   * Whether to show the character count.
   */
  showCharacterCount?: boolean;
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
    minHeight: 80,
    fontSize: '$sm',
    px: '$3',
    py: '$2',
  },
  md: {
    minHeight: 100,
    fontSize: '$md',
    px: '$4',
    py: '$3',
  },
  lg: {
    minHeight: 120,
    fontSize: '$lg',
    px: '$4',
    py: '$3',
  },
} as const;

const stateBorderColor = {
  error: '$danger',
  success: '$success',
} as const;

/**
 * TextArea component with enforced i18n integration.
 *
 * Placeholders, labels, and helper/error text must come from translations.
 *
 * @example
 * ```tsx
 * <TextArea
 *   placeholderKey="common.message_placeholder"
 *   labelKey="common.message_label"
 *   value={message}
 *   onChangeText={setMessage}
 *   maxLength={500}
 *   showCharacterCount={true}
 * />
 * ```
 */
export function TextArea({
  placeholderKey,
  labelKey,
  helperTextKey,
  errorTextKey,
  variant = 'default',
  size = 'md',
  error = false,
  success = false,
  maxLength,
  showCharacterCount,
  value,
  style,
  ...props
}: TextAreaProps) {
  const { t } = useTranslation();

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

  const characterCount = typeof value === 'string' ? value.length : 0;

  return (
    <XStack width="100%" flexDirection="column" gap="$1">
      {labelText && (
        <XStack justifyContent="space-between" alignItems="center">
          <Text i18nKey={labelKey} variant="label" color="muted" />
          {showCharacterCount && maxLength && (
            <Text
              variant="caption"
              color={characterCount > maxLength ? 'danger' : 'muted'}
              i18nKey="common.character_count"
              i18nProps={{ current: characterCount, max: maxLength }}
            />
          )}
        </XStack>
      )}

      <TamaguiTextArea
        {...baseStyle}
        placeholder={placeholderText}
        value={value}
        numberOfLines={4}
        textAlignVertical="top"
        style={style}
        maxLength={maxLength}
        {...props}
      />

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
 * Text area with focus state styling.
 */
export const TextInputArea = styled(TextArea, {
  name: 'TextInputArea',
});
