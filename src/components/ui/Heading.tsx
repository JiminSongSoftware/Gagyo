import type { HeadingProps as TamaguiHeadingProps } from 'tamagui';
import { Heading as TamaguiHeading } from 'tamagui';
import { useTranslation } from '@/i18n';

export interface HeadingProps extends Omit<TamaguiHeadingProps, 'children'> {
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
   * Heading level (h1-h4).
   */
  level?: 'h1' | 'h2' | 'h3' | 'h4';
}

const levelStyles = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
} as const;

/**
 * Heading component with enforced i18n integration.
 *
 * This component does NOT accept children - all text must come from translations
 * via the `i18nKey` prop. Prevents hardcoded strings and ensures all headings
 * are internationalized.
 *
 * @example
 * ```tsx
 * <Heading i18nKey="common.home" level="h1" />
 * <Heading i18nKey="settings.title" level="h2" />
 * <Heading i18nKey="common.welcome" i18nParams={{ name: 'John' }} level="h3" />
 * ```
 */
export function Heading({
  i18nKey,
  i18nParams,
  level = 'h2',
  ...props
}: HeadingProps) {
  const { t } = useTranslation();

  const translatedText = t(i18nKey, i18nParams);

  return (
    <TamaguiHeading {...levelStyles[level]} {...props}>
      {translatedText}
    </TamaguiHeading>
  );
}
