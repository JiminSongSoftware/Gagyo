/**
 * Hook for managing locale in components.
 */

import { useCallback } from 'react';
import type { Locale } from '@/i18n';
import { changeLocale, getCurrentLocale, isKorean, isEnglish } from '@/i18n';
import { usePreferencesStore } from '@/stores/preferences';

/**
 * Hook for locale management with persistence.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { locale, changeLocale, isKorean, isEnglish } = useLocale();
 *
 *   return (
 *     <Button
 *       labelKey={isKorean ? 'common.switch_to_english' : 'common.switch_to_korean'}
 *       onPress={() => changeLocale(isKorean ? 'en' : 'ko')}
 *     />
 *   );
 * }
 * ```
 */
export function useLocale() {
  const setLocale = usePreferencesStore((state) => state.setLocale);

  const locale = getCurrentLocale();
  const handleChangeLocale = useCallback(
    async (newLocale: Locale) => {
      await changeLocale(newLocale);
      setLocale(newLocale);
    },
    [setLocale]
  );

  return {
    locale,
    changeLocale: handleChangeLocale,
    isKorean: isKorean(),
    isEnglish: isEnglish(),
  };
}
