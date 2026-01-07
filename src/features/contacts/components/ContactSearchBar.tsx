/**
 * ContactSearchBar component.
 *
 * Search input field for filtering contacts.
 * Matches the Figma design with a gray background and search icon.
 */

import { useCallback } from 'react';
import { TextInput, StyleSheet, View } from 'react-native';
import { Stack, XStack } from 'tamagui';
import { Text as TamaguiText } from 'tamagui';
import { useTranslation } from '@/i18n';

export interface ContactSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
}

/**
 * Search icon component (simple magnifying glass using text).
 */
function SearchIcon() {
  return (
    <TamaguiText style={{ fontSize: 18, color: '#40434d' }}>
      🔍
    </TamaguiText>
  );
}

/**
 * ContactSearchBar component.
 */
export function ContactSearchBar({
  value,
  onChangeText,
  placeholder,
  testID,
}: ContactSearchBarProps) {
  const { t } = useTranslation();
  const defaultPlaceholder = placeholder ?? t('contacts.search_placeholder');

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);
    },
    [onChangeText]
  );

  return (
    <Stack
      backgroundColor="$backgroundSecondary"
      borderRadius="$2"
      padding="$3"
      testID={testID ?? 'contact-search-bar'}
    >
      <XStack alignItems="center" gap="$2">
        <View style={styles.searchIcon}>
          <SearchIcon />
        </View>

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder={defaultPlaceholder}
          placeholderTextColor="#8e8e93"
          testID="contact-search-input"
        />
      </XStack>
    </Stack>
  );
}

const styles = StyleSheet.create({
  searchIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    color: '#40434d',
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    color: '#363b4b',
    minHeight: 24,
  },
});
