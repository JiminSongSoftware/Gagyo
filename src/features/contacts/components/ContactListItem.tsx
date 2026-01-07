/**
 * ContactListItem component.
 *
 * Displays a single contact in the contacts list with:
 * - Soft gray circular avatar (decorative, no initials)
 * - Group/member name
 * - Member count on right (for groups)
 */

import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { XStack, YStack } from 'tamagui';
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
        paddingHorizontal="$4"
        paddingVertical="$3"
        gap="$3"
        style={styles.item}
      >
        {/* Soft gray circular avatar (decorative) */}
        <View
          style={styles.avatar}
        />

        {/* Name */}
        <YStack flex={1}>
          <TamaguiText
            fontSize={16}
            fontWeight="400"
            color="$color1"
            numberOfLines={1}
          >
            {contact.name}
          </TamaguiText>
        </YStack>

        {/* Member count (for groups) */}
        {contact.memberCount && contact.category !== 'member' && (
          <TamaguiText
            fontSize={14}
            fontWeight="400"
            color="#6d6d73"
          >
            {contact.memberCount}
          </TamaguiText>
        )}
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: 56,
    backgroundColor: '#ffffff',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
});
