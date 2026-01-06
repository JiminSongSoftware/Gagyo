/**
 * Locale Selector Component
 *
 * Allows users to switch between English and Korean languages.
 * Changes are applied immediately to the UI.
 *
 * Features:
 * - testID for E2E testing
 * - i18n support
 * - Immediate UI refresh on selection
 *
 * @module features/settings/components/LocaleSelector
 */

import { useMemo } from 'react';
import {
  XStack,
  YStack,
  Text as TamaguiText,
  Switch,
  styled,
  useTheme,
} from 'tamagui';
import { useTranslation } from '@/i18n';
import type { Locale } from '@/i18n/types';

// ============================================================================
// TYPES
// ============================================================================

export interface LocaleSelectorProps {
  /**
   * Current locale.
   */
  value: Locale;

  /**
   * Callback when locale changes.
   */
  onChange: (locale: Locale) => void | Promise<void>;

  /**
   * Test ID for E2E testing.
   */
  testID?: string;
}

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const OptionButton = styled(XStack, {
  name: 'LocaleOptionButton',
  flex: 1,
  padding: '$3',
  borderRadius: '$3',
  borderWidth: 1,
  borderColor: '$borderLight',
  alignItems: 'center',
  gap: '$2',
  cursor: 'pointer',
  pressStyle: {
    backgroundColor: '$backgroundSecondary',
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LocaleSelector({
  value,
  onChange,
  testID = 'locale-selector',
}: LocaleSelectorProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const isKorean = value === 'ko';

  const handleLocaleToggle = () => {
    const newLocale: Locale = isKorean ? 'en' : 'ko';
    void onChange(newLocale);
  };

  return (
    <YStack testID={testID} gap="$2" backgroundColor="$background" padding="$4" borderRadius="$4">
      <XStack justifyContent="space-between" alignItems="center">
        <YStack flex={1} gap="$1">
          <TamaguiText
            testID={`${testID}-label`}
            fontSize="$md"
            fontWeight="600"
            color="$color"
          >
            {t('settings.language')}
          </TamaguiText>
          <TamaguiText fontSize="$sm" color="$color3">
            {isKorean ? t('settings.korean') : t('settings.english')}
          </TamaguiText>
        </YStack>

        <XStack alignItems="center" gap="$3">
          <TamaguiText
            testID={`${testID}-english-label`}
            fontSize="$sm"
            color={isKorean ? '$color3' : '$color'}
          >
            EN
          </TamaguiText>

          <Switch
            testID={`${testID}-switch`}
            checked={isKorean}
            onCheckedChange={handleLocaleToggle}
            backgroundColor={isKorean ? '$color3' : '$borderLight'}
            backgroundColorChecked="$primary"
          >
            <Switch.Thumb animation="quick" />
          </Switch>

          <TamaguiText
            testID={`${testID}-korean-label`}
            fontSize="$sm"
            color={isKorean ? '$color' : '$color3'}
          >
            KO
          </TamaguiText>
        </XStack>
      </XStack>
    </YStack>
  );
}

LocaleSelector.displayName = 'LocaleSelector';
