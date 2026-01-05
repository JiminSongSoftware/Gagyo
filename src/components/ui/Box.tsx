import type { StackProps } from 'tamagui';
import { Stack, styled } from 'tamagui';

export interface BoxProps extends StackProps {
  /**
   * Pre-defined variant for common patterns.
   */
  variant?: 'default' | 'card' | 'section' | 'inline';
}

const variants = {
  card: {
    backgroundColor: '$background',
    borderWidth: 1,
    borderColor: '$border',
    borderRadius: '$4',
    p: '$4',
    shadowColor: '$shadowColor',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  section: {
    py: '$6',
  },
  inline: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
};

/**
 * Box component - a flexible container using Tamagui Stack.
 *
 * Provides all Tamagui style props and optional variants for common patterns.
 *
 * @example
 * ```tsx
 * <Box p="$4" bg="$backgroundSecondary">
 *   <Text>Content</Text>
 * </Box>
 *
 * <Box variant="card">
 *   <Text>Card content</Text>
 * </Box>
 * ```
 */
export function Box({ variant = 'default', children, ...props }: BoxProps) {
  return (
    <Stack {...variants[variant]} {...props}>
      {children}
    </Stack>
  );
}

/**
 * Styled Box component with elevated shadow effect.
 */
export const ElevatedBox = styled(Box, {
  name: 'ElevatedBox',
  backgroundColor: '$background',
  shadowColor: '$shadowColor',
  shadowOpacity: 0.15,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  borderRadius: '$4',
});

/**
 * Styled Box component with border.
 */
export const BorderedBox = styled(Box, {
  name: 'BorderedBox',
  borderWidth: 1,
  borderColor: '$border',
  borderRadius: '$4',
});
