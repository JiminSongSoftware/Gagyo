/**
 * i18n configuration and initialization using i18next.
 */

import i18n, { type TOptions } from 'i18next';
import { initReactI18next, useTranslation, Trans } from 'react-i18next';
import { getLocales } from 'expo-localization';
import enCommon from '../../locales/en/common.json';
import enAuth from '../../locales/en/auth.json';
import enChat from '../../locales/en/chat.json';
import enPrayer from '../../locales/en/prayer.json';
import enPastoral from '../../locales/en/pastoral.json';
import enSettings from '../../locales/en/settings.json';
import enErrors from '../../locales/en/errors.json';
import koCommon from '../../locales/ko/common.json';
import koAuth from '../../locales/ko/auth.json';
import koChat from '../../locales/ko/chat.json';
import koPrayer from '../../locales/ko/prayer.json';
import koPastoral from '../../locales/ko/pastoral.json';
import koSettings from '../../locales/ko/settings.json';
import koErrors from '../../locales/ko/errors.json';

// Resources object with all translations
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    chat: enChat,
    prayer: enPrayer,
    pastoral: enPastoral,
    settings: enSettings,
    errors: enErrors,
  },
  ko: {
    common: koCommon,
    auth: koAuth,
    chat: koChat,
    prayer: koPrayer,
    pastoral: koPastoral,
    settings: koSettings,
    errors: koErrors,
  },
} as const;

/**
 * Detects the best locale to use based on user preference and device settings.
 */
function detectLocale(): 'en' | 'ko' {
  // 1. Check if there's a saved preference
  // This would come from the preferences store, but we'll initialize here first

  // 2. Check device locale
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

  // 3. Fallback to English
  return 'en';
}

/**
 * Initialize i18next with configuration.
 */
export async function initI18n(): Promise<typeof i18n> {
  const detectedLocale = detectLocale();

  await i18n.use(initReactI18next).init({
    lng: detectedLocale,
    fallbackLng: 'en',
    ns: ['common', 'auth', 'chat', 'prayer', 'pastoral', 'settings', 'errors'],
    defaultNS: 'common',
    nsSeparator: '.',
    keySeparator: false,
    debug: __DEV__,
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
    react: {
      useSuspense: false,
    },
    resources: resources as unknown as Record<string, unknown>,
  });

  return i18n;
}

/**
 * Get the current locale.
 */
export function getCurrentLocale(): 'en' | 'ko' {
  return i18n.language as 'en' | 'ko';
}

/**
 * Change the current locale.
 */
export async function changeLocale(locale: 'en' | 'ko'): Promise<void> {
  await i18n.changeLanguage(locale);
}

/**
 * Check if the current locale is Korean.
 */
export function isKorean(): boolean {
  return i18n.language === 'ko';
}

/**
 * Check if the current locale is English.
 */
export function isEnglish(): boolean {
  return i18n.language === 'en';
}

/**
 * Export the i18n instance for direct use.
 */
export { i18n };

/**
 * Export translation function for use outside React components.
 */
export function translate(
  key: string,
  options?: Record<string, string | number | boolean> | string
): string {
  return i18n.t(key, options as TOptions);
}

/**
 * Re-export react-i18next hooks and components for convenience.
 */
export { useTranslation, Trans };

/**
 * Re-export initialization utilities.
 */
export {
  initI18nForApp,
  initI18nForStorybook,
  detectDeviceLocale,
  isI18nInitialized,
} from './init';

/**
 * Default export for convenience.
 */
export default i18n;
