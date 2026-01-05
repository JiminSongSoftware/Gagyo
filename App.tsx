import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18nForApp } from '@/i18n';
import { usePreferencesStore } from '@/stores/preferences';
import i18n from '@/i18n';

/**
 * Loading screen shown while i18n initializes.
 */
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
}

/**
 * Main app component with i18n initialization.
 *
 * The app initializes i18n before rendering to ensure:
 * - Translations are available immediately
 * - Saved locale preference is restored
 * - Device locale is detected on first launch
 */
export default function App() {
  const [isI18nReady, setIsI18nReady] = useState(false);
  const _hasHydrated = usePreferencesStore((state) => state._hasHydrated);
  const savedLocale = usePreferencesStore((state) => state.locale);

  useEffect(() => {
    // Initialize i18n when the app starts
    // We wait for hydration to get the saved locale preference
    const initializeI18n = async () => {
      try {
        const locale = await initI18nForApp(savedLocale);

        // Update the store if locale was changed during init
        // (e.g., device locale detected on first launch)
        if (locale !== savedLocale) {
          usePreferencesStore.getState().setLocale(locale);
        }
      } catch (error) {
        console.error('[App] Failed to initialize i18n:', error);
      } finally {
        setIsI18nReady(true);
      }
    };

    // Only initialize after hydration or with a timeout
    if (_hasHydrated) {
      initializeI18n();
    } else {
      // Add a timeout in case hydration takes too long
      const timeoutId = setTimeout(() => {
        initializeI18n();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [_hasHydrated, savedLocale]);

  // Show loading screen while i18n initializes
  if (!isI18nReady) {
    return <LoadingScreen />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <View style={styles.container}>
        <StatusBar style="auto" />
      </View>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
