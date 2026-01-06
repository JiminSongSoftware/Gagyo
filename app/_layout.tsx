import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as Sentry from '@sentry/react-native';
import { useEffect, useState } from 'react';
import { TamaguiProvider, Text, View, YStack, useThemeName } from 'tamagui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initI18n, i18n, useTranslation } from '@/i18n';
import { I18nextProvider } from 'react-i18next';
import { initSentry } from '@/lib/monitoring/sentry';
import { initPostHog } from '@/lib/monitoring/posthog';
import config from '../tamagui.config';
import { useAuth } from '@/hooks/useAuth';
import { useTenantStore } from '@/stores/tenantStore';
import { useNotificationHandler } from '@/features/notifications';

/**
 * Initialize Sentry and PostHog monitoring services.
 * Must be called before any providers are rendered.
 */
function initializeMonitoring(): void {
  try {
    // Initialize Sentry error tracking
    initSentry({
      dsn: process.env.SENTRY_DSN!,
    });
  } catch (e) {
    console.error('[Layout] Sentry init failed:', e);
  }

  try {
    // Initialize PostHog analytics
    initPostHog({
      apiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY!,
    });
  } catch (e) {
    console.error('[Layout] PostHog init failed:', e);
  }
}

/**
 * Error fallback component displayed when Sentry catches an error.
 */
function ErrorFallback({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="$4"
      backgroundColor={isDark ? '$background' : '$bgColor'}
    >
      <YStack alignItems="center" gap="$4">
        <Text fontSize="$8" color="$red10">
          ⚠️
        </Text>
        <Text fontSize="$6" fontWeight="bold" color={isDark ? '$color' : '$color'}>
          {t('errors.something_went_wrong')}
        </Text>
        <Text fontSize="$4" textAlign="center" color="$gray10">
          {t('errors.app_crashed')}
        </Text>
        <Text fontSize="$3" color="$gray11" textAlign="center" numberOfLines={3} maxWidth={300}>
          {error?.message}
        </Text>
        <PostHogProvider>
          <YStack
            backgroundColor="$blue10"
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
        </PostHogProvider>
      </YStack>
    </View>
  );
}

/**
 * PostHog provider wrapper component.
 */
function PostHogProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}

/**
 * Auth navigation guard component.
 *
 * Redirects users based on authentication and tenant context state:
 * - No session → Login screen
 * - Session but no tenant → Tenant selection screen
 * - Session and tenant → Main app
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>;
}

export default function RootLayout() {
  const [i18nInstance, setI18nInstance] = useState<typeof i18n | null>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // Set up push notification handler
  const { processInitialNotification } = useNotificationHandler();

  // Initialize monitoring services before i18n
  useEffect(() => {
    initializeMonitoring();
  }, []);

  useEffect(() => {
    initI18n()
      .then((instance) => {
        console.log('[Layout] i18n initialized:', instance.language);
        setI18nInstance(instance);
      })
      .catch((error) => {
        console.error('[Layout] i18n init failed:', error);
        // Set a minimal i18n instance to prevent blank screen
        setI18nInstance(i18n);
      });
  }, []);

  // Process cold start notification (app launched from notification)
  useEffect(() => {
    if (i18nInstance) {
      void processInitialNotification();
    }
  }, [i18nInstance, processInitialNotification]);

  if (!i18nInstance) {
    return (
      <TamaguiProvider config={config} defaultTheme={theme}>
        <View flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
          <Text>Loading...</Text>
        </View>
      </TamaguiProvider>
    );
  }

  return (
    <TamaguiProvider config={config} defaultTheme={theme}>
      <I18nextProvider i18n={i18nInstance}>
        <Sentry.ErrorBoundary fallback={ErrorFallback}>
          <PostHogProvider>
            <AuthGuard>
              <StatusBarWrapper />
              <Stack>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="chat" options={{ headerShown: false }} />
                <Stack.Screen name="prayer" options={{ headerShown: false }} />
                <Stack.Screen name="pastoral" options={{ headerShown: false }} />
              </Stack>
            </AuthGuard>
          </PostHogProvider>
        </Sentry.ErrorBoundary>
      </I18nextProvider>
    </TamaguiProvider>
  );
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
