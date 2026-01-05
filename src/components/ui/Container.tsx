import type { StackProps } from 'tamagui';
import { Stack, useMedia } from 'tamagui';

export interface ContainerProps extends Omit<StackProps, 'maxWidth'> {
  /**
   * Maximum width of the container.
   * @default 'lg'
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | number;

  /**
   * Whether to center the container horizontally.
   * @default false
   */
  centered?: boolean;

  /**
   * Whether to apply default padding.
   * @default false
   */
  padded?: boolean;

  /**
   * Custom padding value.
   */
  padding?: StackProps['padding'];
}

const maxWidthMap = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

/**
 * Container component for constraining content width with optional centering and padding.
 *
 * @example
 * ```tsx
 * <Container>
 *   <Text>Content is centered and max-width constrained</Text>
 * </Container>
 *
 * <Container maxWidth="md" centered padded>
 *   <Text>Content with custom max width and padding</Text>
 * </Container>
 * ```
 */
export function Container({
  children,
  maxWidth = 'lg',
  centered = false,
  padded = false,
  padding,
  ...stackProps
}: ContainerProps) {
  const media = useMedia();

  const maxWidthValue = typeof maxWidth === 'number' ? maxWidth : maxWidthMap[maxWidth];

  return (
    <Stack
      width="100%"
      maxWidth={maxWidthValue}
      mx={centered ? 'auto' : undefined}
      p={padded ? '$4' : padding}
      {...stackProps}
    >
      {children}
    </Stack>
  );
}
