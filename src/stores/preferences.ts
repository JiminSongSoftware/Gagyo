/**
 * Zustand store for persisting user preferences.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '@/i18n';

export interface PreferencesState {
  /**
   * User's preferred language.
   */
  locale: Locale;

  /**
   * User's preferred theme.
   */
  theme: 'light' | 'dark' | 'system';

  /**
   * Set the locale preference.
   */
  setLocale: (locale: Locale) => void;

  /**
   * Set the theme preference.
   */
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  /**
   * Hydration state.
   */
  _hasHydrated: boolean;

  /**
   * Set hydration state.
   */
  _setHasHydrated: (state: boolean) => void;
}

/**
 * Preferences store with persistence using AsyncStorage.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { locale, theme, setLocale, setTheme } = usePreferencesStore();
 *
 *   return (
 *     <Text>Current locale: {locale}</Text>
 *     <Button labelKey="common.change_language" onPress={() => setLocale('ko')} />
 *   );
 * }
 * ```
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      // Default state
      locale: 'en',
      theme: 'system',
      _hasHydrated: false,

      // Actions
      setLocale: (locale) => set({ locale }),

      setTheme: (theme) => set({ theme }),

      _setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'gagyo-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state._setHasHydrated(true);
      },
    }
  )
);

/**
 * Hook to get the hydration state of the preferences store.
 */
export function useHasHydrated() {
  return usePreferencesStore((state) => state._hasHydrated);
}

/**
 * Hook to get the current locale from preferences.
 */
export function useLocalePreference(): Locale {
  return usePreferencesStore((state) => state.locale);
}

/**
 * Hook to get the current theme preference.
 */
export function useThemePreference(): 'light' | 'dark' | 'system' {
  return usePreferencesStore((state) => state.theme);
}
