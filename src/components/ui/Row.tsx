import type { XStackProps } from 'tamagui';
import { XStack, styled } from 'tamagui';

export interface RowProps extends XStackProps {
  /**
   * Whether the row should wrap its children.
   * @default false
   */
  wrap?: boolean;
}

/**
 * Row component - horizontal layout using XStack.
 *
 * Provides consistent horizontal layout with spacing, alignment, and wrapping support.
 *
 * @example
 * ```tsx
 * <Row gap="$2" alignItems="center">
 *   <Text>Item 1</Text>
 *   <Text>Item 2</Text>
 * </Row>
 *
 * <Row gap="$4" justifyContent="space-between">
 *   <Text>Left</Text>
 *   <Text>Right</Text>
 * </Row>
 * ```
 */
export function Row({ wrap = false, children, ...props }: RowProps) {
  return (
    <XStack flexWrap={wrap ? 'wrap' : undefined} {...props}>
      {children}
    </XStack>
  );
}

/**
 * Centered Row variant - centers content horizontally and vertically.
 */
export const CenteredRow = styled(Row, {
  name: 'CenteredRow',
  alignItems: 'center',
  justifyContent: 'center',
});

/**
 * Spaced Row variant - distributes space evenly between items.
 */
export const SpacedRow = styled(Row, {
  name: 'SpacedRow',
  justifyContent: 'space-between',
  alignItems: 'center',
});
