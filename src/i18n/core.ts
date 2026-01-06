/**
 * Core i18n instance and shared utilities.
 * This file has no dependencies on other i18n modules to avoid circular imports.
 */

import i18n, { type Resource, type TOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../../locales/en/common.json';
import enAuth from '../../locales/en/auth.json';
import enChat from '../../locales/en/chat.json';
import enPrayer from '../../locales/en/prayer.json';
import enPastoral from '../../locales/en/pastoral.json';
import enSettings from '../../locales/en/settings.json';
import enErrors from '../../locales/en/errors.json';
import enImages from '../../locales/en/images.json';
import koCommon from '../../locales/ko/common.json';
import koAuth from '../../locales/ko/auth.json';
import koChat from '../../locales/ko/chat.json';
import koPrayer from '../../locales/ko/prayer.json';
import koPastoral from '../../locales/ko/pastoral.json';
import koSettings from '../../locales/ko/settings.json';
import koErrors from '../../locales/ko/errors.json';
import koImages from '../../locales/ko/images.json';
import type { TranslationKey } from './types';

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
    images: enImages,
  },
  ko: {
    common: koCommon,
    auth: koAuth,
    chat: koChat,
    prayer: koPrayer,
    pastoral: koPastoral,
    settings: koSettings,
    errors: koErrors,
    images: koImages,
  },
} satisfies Resource;

/**
 * Initialize i18next with configuration.
 */
export async function initI18n(): Promise<typeof i18n> {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common', 'auth', 'chat', 'prayer', 'pastoral', 'settings', 'errors', 'images'],
    defaultNS: 'common',
    nsSeparator: '.',
    keySeparator: '.',
    debug: __DEV__,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    resources,
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
 * Export the i18n instance.
 */
export { i18n };

/**
 * Translation function for non-React usage.
 */
export function translate(key: TranslationKey | string, options?: TOptions): string {
  const t = i18n.t.bind(i18n) as (translationKey: string, tOptions?: TOptions) => string;
  return t(key as string, options);
}
