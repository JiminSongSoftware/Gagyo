/**
 * i18n configuration and initialization using i18next.
 *
 * This is the main entry point for i18n functionality.
 * Core functions are in core.ts to avoid circular dependencies.
 */

import { useTranslation as useI18nextTranslation, Trans } from 'react-i18next';
import type { TOptions } from 'i18next';
import type { TranslationKey } from './types';
import { i18n } from './core';

// Re-export core functions and types
export { initI18n, changeLocale, getCurrentLocale, translate } from './core';

/**
 * Export the i18n instance for direct use.
 */
export { i18n };
export default i18n;

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
 * Typed translation hook wrapper to support namespace.key usage.
 */
export function useTranslation() {
  const response = useI18nextTranslation();
  const t = (key: TranslationKey | string, options?: TOptions): string =>
    response.t(key as string, options) as string;

  return { ...response, t };
}

/**
 * Re-export react-i18next Trans component for convenience.
 */
export { Trans };

/**
 * Re-export initialization utilities from init.ts.
 */
export {
  initI18nForApp,
  initI18nForStorybook,
  detectDeviceLocale,
  isI18nInitialized,
} from './init';

/**
 * Re-export types.
 */
export type { Locale } from './types';
