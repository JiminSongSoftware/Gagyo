import { Text as TamaguiText } from 'tamagui';
import type { StyledProps } from 'tamagui';

export type ThemedTextProps = StyledProps<typeof TamaguiText> & {
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

/**
 * @deprecated Use `Text` or `Heading` from `@/components/ui` instead.
 * This component is kept for backwards compatibility during migration.
 *
 * New usage:
 * - <Heading i18nKey="..." /> for titles
 * - <Text i18nKey="..." /> for body text
 */
export function ThemedText({ type = 'default', style, ...rest }: ThemedTextProps) {
  switch (type) {
    case 'title':
      return (
        <TamaguiText
          fontSize={32}
          fontWeight="bold"
          lineHeight={32}
          color="$color"
          style={style}
          {...rest}
        />
      );
    case 'subtitle':
      return (
        <TamaguiText
          fontSize={20}
          fontWeight="bold"
          color="$color"
          style={style}
          {...rest}
        />
      );
    case 'defaultSemiBold':
      return (
        <TamaguiText
          fontSize={16}
          lineHeight={24}
          fontWeight="600"
          color="$color"
          style={style}
          {...rest}
        />
      );
    case 'link':
      return (
        <TamaguiText
          fontSize={16}
          lineHeight={30}
          color="$primary"
          style={style}
          {...rest}
        />
      );
    default:
      return (
        <TamaguiText
          fontSize={16}
          lineHeight={24}
          color="$color"
          style={style}
          {...rest}
        />
      );
  }
}
