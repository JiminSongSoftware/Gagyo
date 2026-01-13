/**
 * ContactListItem component.
 *
 * Displays a single contact in the contacts list with:
 * - Soft gray circular avatar (48px, decorative)
 * - Group/member name (16px semibold, #40434D)
 * - Member count inline with name (12px, #8E8E93, for groups)
 *
 * Figma specs: 48px avatar, 16px semibold name, reduced padding.
 */

import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { XStack } from 'tamagui';
import { Text as TamaguiText } from 'tamagui';
import type { ContactListItemProps } from '../types';

/**
 * ContactListItem component.
 */
export function ContactListItem({ contact, onPress, testID }: ContactListItemProps) {
  const handlePress = useCallback(() => {
    onPress?.(contact);
  }, [contact, onPress]);

  const itemTestID = testID ?? `contact-item-${contact.id}`;

  return (
    <Pressable onPress={handlePress} testID={itemTestID} accessibilityRole="button">
      <XStack
        alignItems="center"
        paddingHorizontal={16}
        paddingVertical={8}
        gap={12}
        style={styles.item}
      >
        {/* Soft gray circular avatar (48px) */}
        <View style={styles.avatar} />

        {/* Name and member count */}
        <XStack flex={1} alignItems="center" gap={6}>
          <TamaguiText
            fontSize={18}
            fontWeight="700"
            color="#40434D"
            numberOfLines={1}
          >
            {contact.name}
          </TamaguiText>

          {/* Member count inline with name (for groups) */}
          {contact.memberCount && contact.category !== 'member' && (
            <TamaguiText
              fontSize={16}
              fontWeight="700"
              color="#8E8E93"
            >
              {contact.memberCount}
            </TamaguiText>
          )}
        </XStack>
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: 64,
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DFE2E8',
  },
});
