// Reanimated must be imported first for proper UI manager registration
import 'react-native-reanimated';

import { useRouter, useSegments, Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import { TamaguiProvider, Text, YStack, useThemeName } from 'tamagui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation, i18n } from '@/i18n';
import config from '../tamagui.config';
import { useAuth } from '@/hooks/useAuth';
import { useTenantStore } from '@/stores/tenantStore';
import { useNotificationHandler } from '@/features/notifications';
import { initI18nForApp } from '@/i18n/init';
import { initPostHog } from '@/lib/monitoring/posthog';
import { initSentry } from '@/lib/monitoring/sentry';

/**
 * Loading screen shown while i18n initializes.
 */
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

/**
 * Error fallback component displayed when Sentry catches an error.
 */
function ErrorFallback({
  error,
  resetError,
}: {
  error: unknown;
  resetError: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="$4"
      backgroundColor="$background"
    >
      <YStack alignItems="center" gap="$4">
        <Text fontSize="$8" color="$danger">
          ⚠️
        </Text>
        <Text fontSize="$6" fontWeight="bold" color="$color">
          {t('errors.something_went_wrong')}
        </Text>
        <Text fontSize="$4" textAlign="center" color="$colorHover">
          {t('errors.app_crashed')}
        </Text>
        <Text fontSize="$3" color="$colorHover" textAlign="center" numberOfLines={3} maxWidth={300}>
          {errorMessage}
        </Text>
        <YStack
          backgroundColor="$primary"
          paddingHorizontal="$6"
          paddingVertical="$3"
          borderRadius="$4"
          pressStyle={{ opacity: 0.8 }}
          onPress={resetError}
        >
          <Text color="white" fontWeight="600" fontSize="$4">
            {t('errors.try_again')}
          </Text>
        </YStack>
      </YStack>
    </YStack>
  );
}

/**
 * Auth navigation guard component.
 *
 * Redirects users based on authentication and tenant context state:
 * - No session → Login screen
 * - Session but no tenant → Tenant selection screen
 * - Session and tenant → Main app
 */
function AuthGuard() {
  const { user, loading: authLoading } = useAuth();
  const { activeTenantId, loading: tenantLoading } = useTenantStore();
  const loadTenantFromStorage = useTenantStore((state) => state.loadTenantFromStorage);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Load tenant context on mount
    void loadTenantFromStorage();
  }, [loadTenantFromStorage]);

  useEffect(() => {
    if (authLoading || tenantLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Redirect logic
    if (!user && !inAuthGroup) {
      // Not authenticated → go to login
      router.replace('/(auth)/login');
    } else if (user && !activeTenantId && !inAuthGroup) {
      // Authenticated but no tenant → go to tenant selection
      router.replace('/(auth)/tenant-selection');
    } else if (user && activeTenantId && inAuthGroup) {
      // Authenticated with tenant → go to main app
      router.replace('/(tabs)');
    }
  }, [user, activeTenantId, segments, authLoading, tenantLoading, router]);

  return (
    <>
      <StatusBarWrapper />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';
  const [isI18nReady, setIsI18nReady] = useState(false);

  // Initialize monitoring (Sentry & PostHog) once on mount
  useEffect(() => {
    try {
      initSentry({ dsn: process.env.SENTRY_DSN! });
    } catch (e) {
      console.error('[App] Sentry init failed:', e);
    }
    try {
      initPostHog({ apiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY! });
    } catch (e) {
      console.error('[App] PostHog init failed:', e);
    }
  }, []);

  // Initialize i18n
  useEffect(() => {
    const initializeI18n = async () => {
      console.log('[App] Starting i18n initialization...');
      try {
        await initI18nForApp();
        console.log('[App] i18n initialized successfully');
      } catch (error) {
        console.error('[App] Failed to initialize i18n:', error);
      } finally {
        console.log('[App] Setting i18n ready to true');
        setIsI18nReady(true);
      }
    };
    void initializeI18n();
  }, []);

  // Show loading screen while i18n initializes
  if (!isI18nReady) {
    return <LoadingScreen />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <TamaguiProvider config={config} defaultTheme={theme}>
        <Sentry.ErrorBoundary fallback={ErrorFallback}>
          <NotificationHandlerWrapper>
            <AuthGuard />
          </NotificationHandlerWrapper>
        </Sentry.ErrorBoundary>
      </TamaguiProvider>
    </I18nextProvider>
  );
}

/**
 * Wrapper component that sets up notification handling.
 * Separated to ensure consistent hook ordering across renders.
 */
function NotificationHandlerWrapper({ children }: { children: React.JSX.Element }) {
  const { processInitialNotification } = useNotificationHandler();

  // Process cold start notification (app launched from notification)
  useEffect(() => {
    void processInitialNotification();
  }, [processInitialNotification]);

  return <>{children}</>;
}

/**
 * StatusBar wrapper that updates based on the current theme.
 */
function StatusBarWrapper() {
  const colorScheme = useColorScheme();
  const themeName = useThemeName();

  const isDark = themeName === 'dark' || colorScheme === 'dark';

  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
