/**
 * Search Screen (Placeholder)
 *
 * TODO: Implement full search functionality
 * This is a placeholder screen for the search navigation target.
 */

import { View, StyleSheet } from 'react-native';
import { YStack, Text as TamaguiText } from 'tamagui';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useTranslation } from '@/i18n';
import { SafeScreen } from '@/components/SafeScreen';

export default function SearchScreen() {
  const { t } = useTranslation();
  useRequireAuth();

  return (
    <SafeScreen>
      <View style={styles.container}>
        <YStack flex={1} alignItems="center" justifyContent="center" gap={8}>
          <TamaguiText fontSize={24} fontWeight="600" color="#8E8E93">
            {t('common.search')}
          </TamaguiText>
          <TamaguiText fontSize={14} color="#C7C7CC">
            Coming soon...
          </TamaguiText>
        </YStack>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
});
