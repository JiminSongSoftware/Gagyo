/**
 * Returns the Tamagui theme token for a room type background color.
 *
 * @param conversationType - The type of conversation
 * @returns The Tamagui theme token name (e.g., '$backgroundWarm')
 *
 * @example
 * ```tsx
 * <Stack backgroundColor={getRoomBackgroundColor(conversationType)} />
 * ```
 */
export function getRoomBackgroundColor(
  conversationType: string
): '$backgroundWarm' | '$backgroundCool' | '$backgroundAccent' | '$background' {
  switch (conversationType) {
    case 'small_group':
      return '$backgroundWarm';
    case 'ministry':
      return '$backgroundCool';
    case 'church_wide':
      return '$backgroundAccent';
    default:
      return '$background';
  }
}
