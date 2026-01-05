import type { YStackProps } from 'tamagui';
import { YStack, styled } from 'tamagui';

export interface ColumnProps extends YStackProps {}

/**
 * Column component - vertical layout using YStack.
 *
 * Provides consistent vertical layout with spacing and alignment.
 *
 * @example
 * ```tsx
 * <Column gap="$2">
 *   <Text>Item 1</Text>
 *   <Text>Item 2</Text>
 * </Column>
 *
 * <Column gap="$4" alignItems="center">
 *   <Text>Centered 1</Text>
 *   <Text>Centered 2</Text>
 * </Column>
 * ```
 */
export function Column({ children, ...props }: ColumnProps) {
  return <YStack {...props}>{children}</YStack>;
}

/**
 * Centered Column variant - centers content horizontally and vertically.
 */
export const CenteredColumn = styled(Column, {
  name: 'CenteredColumn',
  alignItems: 'center',
  justifyContent: 'center',
});

/**
 * Spaced Column variant - distributes space evenly between items.
 */
export const SpacedColumn = styled(Column, {
  name: 'SpacedColumn',
  justifyContent: 'space-between',
});
