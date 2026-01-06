import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { initSentry } from '@/lib/monitoring/sentry';
import { initPostHog } from '@/lib/monitoring/posthog';
import i18nInstance, { initI18n } from '@/i18n';

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

/**
 * Initialize Sentry and PostHog monitoring services.
 */
function initializeMonitoring(): void {
  try {
    initSentry({
      dsn: process.env.SENTRY_DSN!,
    });
  } catch (e) {
    console.error('[App] Sentry init failed:', e);
  }

  try {
    initPostHog({
      apiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY!,
    });
  } catch (e) {
    console.error('[App] PostHog init failed:', e);
  }
}

/**
 * Main app component with i18n initialization.
 *
 * With expo-router app directory, App.tsx renders the root Stack.
 * The app/_layout.tsx file wraps individual screens with their own providers.
 */
export default function App() {
  const [isI18nReady, setIsI18nReady] = useState(false);

  // Initialize monitoring once on mount
  useEffect(() => {
    initializeMonitoring();
  }, []);

  useEffect(() => {
    const initializeI18n = async () => {
      try {
        await initI18n();
        console.log('[App] i18n initialized');
      } catch (error) {
        console.error('[App] Failed to initialize i18n:', error);
      } finally {
        setIsI18nReady(true);
      }
    };

    void initializeI18n();
  }, []);

  if (!isI18nReady) {
    return <LoadingScreen />;
  }

  return (
    <I18nextProvider i18n={i18nInstance}>
      <Stack />
    </I18nextProvider>
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
