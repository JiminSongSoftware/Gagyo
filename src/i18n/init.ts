/**
 * i18n initialization utility for App and Storybook.
 *
 * This module handles the complete i18n initialization flow:
 * 1. Detect device locale
 * 2. Check for saved preference in preferences store
 * 3. Initialize i18next with detected/preferred locale
 * 4. Handle errors with fallback to 'en'
 *
 * Usage:
 * ```tsx
 * // In App.tsx
 * import { initI18nForApp } from '@/i18n/init';
 *
 * export default function App() {
 *   const [isI18nReady, setIsI18nReady] = useState(false);
 *
 *   useEffect(() => {
 *     initI18nForApp().then(() => setIsI18nReady(true));
 *   }, []);
 *
 *   if (!isI18nReady) return <LoadingScreen />;
 *   return <AppContent />;
 * }
 *
 * // In Storybook preview.tsx
 * import { initI18nForStorybook } from '@/i18n/init';
 *
 * initI18nForStorybook();
 * ```
 */

import { getLocales } from 'expo-localization';
import { initI18n as baseInitI18n, changeLocale, getCurrentLocale } from './index';
import type { Locale } from './types';

/**
 * Detects the best locale to use based on device settings.
 *
 * Priority:
 * 1. User preference from preferences store (if available)
 * 2. Device locale detection
 * 3. Fallback to 'en'
 */
export function detectDeviceLocale(): Locale {
  const deviceLocales = getLocales();

  for (const locale of deviceLocales) {
    const languageCode = locale.languageCode?.toLowerCase();
    if (languageCode === 'ko') {
      return 'ko';
    }
    if (languageCode === 'en') {
      return 'en';
    }
  }

  return 'en';
}

/**
 * Initialize i18n for Storybook.
 *
 * Storybook doesn't have access to AsyncStorage, so we skip
 * preference restoration and use device locale only.
 *
 * @param initialLocale - Optional locale to force (for testing)
 * @returns Promise that resolves when i18n is ready
 */
export async function initI18nForStorybook(initialLocale?: Locale): Promise<void> {
  try {
    const locale = initialLocale || detectDeviceLocale();
    await baseInitI18n();

    // Ensure the detected locale is set
    const currentLocale = getCurrentLocale();
    if (currentLocale !== locale) {
      await changeLocale(locale);
    }
  } catch (error) {
    console.error('[i18n] Storybook initialization failed:', error);
    // Storybook should still work with default English
    try {
      await baseInitI18n();
    } catch {
      // Silently fail in Storybook
    }
  }
}

/**
 * Initialize i18n for the main App.
 *
 * This handles the full initialization flow including:
 * - Device locale detection
 * - Preference restoration (via callback)
 * - Error handling with fallback
 *
 * @param savedLocale - Optional saved locale from preferences store
 * @returns Promise that resolves with the initialized locale
 */
export async function initI18nForApp(savedLocale?: Locale | null): Promise<Locale> {
  try {
    await baseInitI18n();

    // Determine the locale to use
    let targetLocale: Locale;

    if (savedLocale && (savedLocale === 'en' || savedLocale === 'ko')) {
      // Use saved preference
      targetLocale = savedLocale;
    } else {
      // Use device locale
      targetLocale = detectDeviceLocale();
    }

    // Set the locale if different from current
    const currentLocale = getCurrentLocale();
    if (currentLocale !== targetLocale) {
      await changeLocale(targetLocale);
    }

    if (__DEV__) {
      console.log(`[i18n] Initialized with locale: ${targetLocale}`);
    }

    return targetLocale;
  } catch (error) {
    console.error('[i18n] App initialization failed, falling back to English:', error);

    // Attempt recovery with English
    try {
      await baseInitI18n();
      await changeLocale('en');
      return 'en';
    } catch {
      // Last resort - return English even if init failed
      return 'en';
    }
  }
}

/**
 * Check if i18n has been initialized.
 *
 * @returns true if i18n is ready to use
 */
export function isI18nInitialized(): boolean {
  try {
    return getCurrentLocale() === 'en' || getCurrentLocale() === 'ko';
  } catch {
    return false;
  }
}

export default initI18nForApp;
