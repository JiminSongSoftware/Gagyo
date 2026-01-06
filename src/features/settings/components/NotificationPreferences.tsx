/**
 * Notification Preferences Component
 *
 * Allows users to toggle push notifications for different types:
 * - Messages
 * - Prayers
 * - Journals
 * - System
 *
 * Features:
 * - testID for E2E testing
 * - i18n support
 * - Auto-save on toggle
 *
 * @module features/settings/components/NotificationPreferences
 */

import {
  XStack,
  YStack,
  Text as TamaguiText,
  Switch,
  styled,
} from 'tamagui';
import { useTranslation } from '@/i18n';
import type { NotificationPreferences } from '../hooks/useUpdateProfile';

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationPreferencesProps {
  /**
   * Current notification preferences.
   */
  value: NotificationPreferences;

  /**
   * Callback when preferences change.
   */
  onChange: (preferences: NotificationPreferences) => void | Promise<void>;

  /**
   * Test ID for E2E testing.
   */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

type NotificationType = keyof NotificationPreferences;

interface NotificationOption {
  key: NotificationType;
  labelKey: string;
  icon: string;
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  { key: 'messages', labelKey: 'settings.message_notifications', icon: '💬' },
  { key: 'prayers', labelKey: 'settings.prayer_notifications', icon: '🙏' },
  { key: 'journals', labelKey: 'settings.journal_notifications', icon: '📖' },
  { key: 'system', labelKey: 'settings.system_notifications', icon: '🔔' },
];

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const PreferenceRow = styled(XStack, {
  name: 'NotificationPreferenceRow',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: '$3',
  borderBottomWidth: 1,
  borderBottomColor: '$borderLight',
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NotificationPreferences({
  value,
  onChange,
  testID = 'notification-preferences',
}: NotificationPreferencesProps) {
  const { t } = useTranslation();

  const handleToggle = (key: NotificationType) => {
    const newValue = {
      ...value,
      [key]: !value[key],
    };
    void onChange(newValue);
  };

  return (
    <YStack testID={testID} gap="$2" backgroundColor="$background" padding="$4" borderRadius="$4">
      <TamaguiText
        testID={`${testID}-label`}
        fontSize="$md"
        fontWeight="600"
        color="$color"
        marginBottom="$2"
      >
        {t('settings.notifications')}
      </TamaguiText>

      <TamaguiText fontSize="$sm" color="$color3" marginBottom="$2">
        {t('settings.notification_description')}
      </TamaguiText>

      {NOTIFICATION_OPTIONS.map((option, index) => {
        const isLast = index === NOTIFICATION_OPTIONS.length - 1;

        return (
          <PreferenceRow
            key={option.key}
            testID={`${testID}-${option.key}`}
            style={isLast ? { borderBottomWidth: 0 } : undefined}
          >
            <XStack alignItems="center" gap="$3" flex={1}>
              <TamaguiText fontSize="$lg">{option.icon}</TamaguiText>
              <TamaguiText
                testID={`${testID}-${option.key}-label`}
                fontSize="$md"
                color="$color"
                flex={1}
              >
                {t(option.labelKey)}
              </TamaguiText>
            </XStack>

            <Switch
              testID={`${testID}-${option.key}-switch`}
              checked={value[option.key]}
              onCheckedChange={() => handleToggle(option.key)}
              size="$2"
              backgroundColor="$borderLight"
              backgroundColorChecked="$primary"
            >
              <Switch.Thumb animation="quick" />
            </Switch>
          </PreferenceRow>
        );
      })}
    </YStack>
  );
}

NotificationPreferences.displayName = 'NotificationPreferences';
