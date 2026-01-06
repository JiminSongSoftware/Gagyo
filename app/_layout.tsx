import { useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as Sentry from '@sentry/react-native';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { TamaguiProvider, Text, View, YStack, useThemeName } from 'tamagui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/i18n';
import config from '../tamagui.config';
import { useAuth } from '@/hooks/useAuth';
import { useTenantStore } from '@/stores/tenantStore';
import { useNotificationHandler } from '@/features/notifications';

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
      </YStack>
    </View>
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
function AuthGuard({ children }: { children: ReactNode }) {
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

export default function RootLayout({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // Set up push notification handler
  const { processInitialNotification } = useNotificationHandler();

  // Process cold start notification (app launched from notification)
  useEffect(() => {
    void processInitialNotification();
  }, [processInitialNotification]);

  return (
    <TamaguiProvider config={config} defaultTheme={theme}>
      <Sentry.ErrorBoundary fallback={ErrorFallback}>
        <AuthGuard>
          <StatusBarWrapper />
          {children}
        </AuthGuard>
      </Sentry.ErrorBoundary>
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
