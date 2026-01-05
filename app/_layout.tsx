import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { TamaguiProvider, useTheme as useTamaguiTheme } from 'tamagui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initI18n, I18nextProvider } from '@/i18n';
import config from '@/tamagui.config';
import type { InitPromise } from 'i18next';
import { useAuth } from '@/hooks/useAuth';
import { useTenantStore } from '@/stores/tenantStore';
import { useNotificationHandler } from '@/features/notifications';

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
  const [i18nInstance, setI18nInstance] = useState<InitPromise | null>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // Set up push notification handler
  const { processInitialNotification } = useNotificationHandler();

  useEffect(() => {
    void initI18n().then((instance) => {
      setI18nInstance(instance);
    });
  }, []);

  // Process cold start notification (app launched from notification)
  useEffect(() => {
    if (i18nInstance) {
      void processInitialNotification();
    }
  }, [i18nInstance, processInitialNotification]);

  if (!i18nInstance) {
    return null;
  }

  return (
    <TamaguiProvider config={config} defaultTheme={theme}>
      <I18nextProvider i18n={i18nInstance}>
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
      </I18nextProvider>
    </TamaguiProvider>
  );
}

/**
 * StatusBar wrapper that updates based on the current theme.
 */
function StatusBarWrapper() {
  const colorScheme = useColorScheme();
  const tamaguiTheme = useTamaguiTheme();

  const isDark = tamaguiTheme?.name === 'dark' || colorScheme === 'dark';

  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
