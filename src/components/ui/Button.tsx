import type { ButtonProps as TamaguiButtonProps } from 'tamagui';
import {
  Button as TamaguiButton,
  useTheme,
  XStack,
  Spinner,
  styled,
} from 'tamagui';
import { useTranslation } from '@/i18n';

export interface ButtonProps extends Omit<TamaguiButtonProps, 'children'> {
  /**
   * The i18n translation key for the button label.
   */
  labelKey: string;

  /**
   * Optional parameters for interpolation in the translation string.
   */
  i18nParams?: Record<string, string | number | boolean>;

  /**
   * Visual variant of the button.
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

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
}

const variantStyles = {
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
 * Button component with enforced i18n integration.
 *
 * All button labels must come from translations via the `labelKey` prop.
 *
 * @example
 * ```tsx
 * <Button labelKey="common.confirm" onPress={handleConfirm} />
 * <Button labelKey="common.submit" variant="primary" size="lg" />
 * <Button labelKey="common.cancel" variant="outline" />
 * <Button labelKey="common.delete" variant="danger" loading={isDeleting} />
 * <Button labelKey="common.next" trailingIcon={<ArrowRight />} />
 * ```
 */
export function Button({
  labelKey,
  i18nParams,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leadingIcon,
  trailingIcon,
  style,
  ...props
}: ButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const labelText = t(labelKey, i18nParams);
  const isDisabled = disabled || loading;

  const baseStyle = {
    ...variantStyles[variant],
    ...sizeStyles[size],
    borderRadius: '$3',
    fontWeight: '600',
    opacity: isDisabled ? 0.5 : 1,
  };

  return (
    <TamaguiButton
      {...baseStyle}
      disabled={isDisabled}
      {...props}
      style={style}
    >
      <XStack gap="$2" alignItems="center" justifyContent="center">
        {loading ? (
          <Spinner size="small" color={variant === 'outline' || variant === 'ghost' ? '$color' : '$color4'} />
        ) : (
          leadingIcon
        )}
        {!loading && labelText}
        {!loading && trailingIcon}
      </XStack>
    </TamaguiButton>
  );
}

/**
 * Primary button variant - pre-configured for main actions.
 */
export const PrimaryButton = styled(Button, {
  name: 'PrimaryButton',
  props: { variant: 'primary' as const },
});

/**
 * Secondary button variant - pre-configured for alternative actions.
 */
export const SecondaryButton = styled(Button, {
  name: 'SecondaryButton',
  props: { variant: 'secondary' as const },
});

/**
 * Outline button variant - pre-configured for secondary actions.
 */
export const OutlineButton = styled(Button, {
  name: 'OutlineButton',
  props: { variant: 'outline' as const },
});

/**
 * Ghost button variant - minimal visual weight.
 */
export const GhostButton = styled(Button, {
  name: 'GhostButton',
  props: { variant: 'ghost' as const },
});

/**
 * Danger button variant - for destructive actions.
 */
export const DangerButton = styled(Button, {
  name: 'DangerButton',
  props: { variant: 'danger' as const },
});
