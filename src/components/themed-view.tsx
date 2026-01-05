import { Stack as TamaguiStack } from 'tamagui';
import type { StyledProps } from 'tamagui';

export type ThemedViewProps = StyledProps<typeof TamaguiStack>;

/**
 * @deprecated Use `Box` from `@/components/ui` instead.
 * This component is kept for backwards compatibility during migration.
 *
 * New usage:
 * - <Box /> for basic containers
 * - <Column /> for vertical layouts
 * - <Row /> for horizontal layouts
 */
export function ThemedView(props: ThemedViewProps) {
  return <TamaguiStack bg="$background" {...props} />;
}
