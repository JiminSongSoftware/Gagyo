/**
 * Settings Screen
 *
 * Main settings screen allowing users to manage:
 * - Profile (display name, photo, email)
 * - Locale (language switching)
 * - Notification preferences
 * - Account deletion
 *
 * Features:
 * - testID for E2E testing
 * - i18n support
 * - Immediate UI refresh on locale change
 *
 * @module app/(tabs)/settings
 */

import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack, Spinner, Separator } from 'tamagui';
import { Container, Heading, Text } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth';
import { SafeScreen } from '@/components/SafeScreen';
import {
  ProfileSection,
  LocaleSelector,
  NotificationPreferences,
  AccountDeletionButton,
} from '@/features/settings/components';
import { useUpdateProfile } from '@/features/settings/hooks';
import type { NotificationPreferences as NotificationPreferencesType } from '@/features/settings/hooks';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface UserProfile {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  email: string;
  locale: 'en' | 'ko';
  notification_preferences: {
    messages: boolean;
    prayers: boolean;
    journals: boolean;
    system: boolean;
  };
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const { updateProfile } = useUpdateProfile();

  // Fetch user profile on mount
  useEffect(() => {
    if (user) {
      void fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data, error } = await supabase.from('users').select('*').eq('id', user?.id).single();

      if (error) {
        throw error;
      }

      setProfile(data as UserProfile);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisplayNameChange = (name: string) => {
    // Fire and forget - the hook handles state/errors
    void updateProfile({ displayName: name }).then((success) => {
      if (success && profile) {
        setProfile({ ...profile, display_name: name });
      }
    });
  };

  const handleLocaleChange = async (newLocale: 'en' | 'ko') => {
    // Update the database (hook handles i18n locale change internally)
    const success = await updateProfile({ locale: newLocale });
    if (success && profile) {
      setProfile({ ...profile, locale: newLocale });
    }
  };

  const handleNotificationPreferencesChange = async (preferences: NotificationPreferencesType) => {
    const success = await updateProfile({ notificationPreferences: preferences });
    if (success && profile) {
      setProfile({ ...profile, notification_preferences: preferences });
    }
  };

  const handlePhotoUploaded = (url: string) => {
    if (profile) {
      setProfile({ ...profile, photo_url: url });
    }
  };

  const handlePhotoRemoved = () => {
    if (profile) {
      setProfile({ ...profile, photo_url: null });
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <SafeScreen>
        <Container testID="settings-screen" padded flex={1}>
          <YStack flex={1} alignItems="center" justifyContent="center">
            <Spinner size="large" color="$primary" />
            <Text i18nKey="common.loading" marginTop="$4" color="muted" />
          </YStack>
        </Container>
      </SafeScreen>
    );
  }

  if (!profile || !user) {
    return (
      <SafeScreen>
        <Container testID="settings-screen" padded flex={1}>
          <YStack flex={1} alignItems="center" justifyContent="center">
            <Text i18nKey="common.error" color="danger" />
          </YStack>
        </Container>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView testID="settings-screen" style={{ flex: 1 }}>
        <Container padded>
        <YStack gap="$4" width="100%">
          {/* Header */}
          <Heading level="h1" i18nKey="common.nav.settings" />

          {/* Profile Section */}
          <ProfileSection
            displayName={profile.display_name}
            photoUrl={profile.photo_url}
            email={user.email || ''}
            emailVerified={!!user.email_confirmed_at}
            onDisplayNameChange={handleDisplayNameChange}
            onPhotoUploaded={handlePhotoUploaded}
            onPhotoRemoved={handlePhotoRemoved}
          />

          <Separator />

          {/* Locale Selector */}
          <LocaleSelector value={profile.locale} onChange={handleLocaleChange} />

          {/* Notification Preferences */}
          <NotificationPreferences
            value={profile.notification_preferences}
            onChange={handleNotificationPreferencesChange}
          />

          {/* Account Actions */}
          <YStack gap="$3" marginTop="$2">
            <Text i18nKey="settings.account" fontSize="$lg" fontWeight="700" />

            <YStack gap="$2">
              <XStack
                testID="logout-button"
                onPress={() => {
                  void handleLogout();
                }}
                alignItems="center"
                justifyContent="center"
                padding="$4"
                backgroundColor="$backgroundSecondary"
                borderRadius="$3"
                borderWidth={1}
                borderColor="$borderLight"
                pressStyle={{ backgroundColor: '$backgroundTertiary' }}
                accessibilityRole="button"
                accessibilityLabel={t('common.logout')}
              >
                <Text i18nKey="common.logout" />
              </XStack>
            </YStack>
          </YStack>

          {/* Account Deletion */}
          <AccountDeletionButton />
        </YStack>
      </Container>
    </ScrollView>
    </SafeScreen>
  );
}
