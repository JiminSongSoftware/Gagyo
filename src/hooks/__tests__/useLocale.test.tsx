/**
 * Tests for useLocale hook following TDD.
 *
 * Test order:
 * 1. Basic return values
 * 2. Locale detection
 * 3. Locale switching with persistence
 * 4. isKorean/isEnglish helpers
 * 5. Multiple rapid switches
 */

import { renderHook, act } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n, changeLocale } from '@/i18n';
import { usePreferencesStore } from '@/stores/preferences';
import { useLocale } from '../useLocale';

// Wrapper to provide i18n context
function createWrapper(_locale: 'en' | 'ko' = 'en') {
  return function TestI18nProvider({ children }: { children: React.ReactNode }) {
    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
  };
}

describe('useLocale hook', () => {
  beforeAll(async () => {
    await initI18n();
  });

  beforeEach(async () => {
    // Reset to English before each test
    await act(async () => {
      await changeLocale('en');
    });
    // Reset the store
    usePreferencesStore.setState({ locale: 'en' });
  });

  describe('basic return values', () => {
    it('returns the current locale', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper(),
      });

      expect(result.current.locale).toBe('en');
    });

    it('returns a changeLocale function', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.changeLocale).toBe('function');
    });

    it('returns isKorean boolean', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.isKorean).toBe('boolean');
    });

    it('returns isEnglish boolean', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.isEnglish).toBe('boolean');
    });
  });

  describe('locale detection', () => {
    it('detects English locale correctly', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper('en'),
      });

      expect(result.current.locale).toBe('en');
      expect(result.current.isEnglish).toBe(true);
      expect(result.current.isKorean).toBe(false);
    });

    it('detects Korean locale correctly', async () => {
      await act(async () => {
        await changeLocale('ko');
      });

      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper('ko'),
      });

      expect(result.current.locale).toBe('ko');
      expect(result.current.isKorean).toBe(true);
      expect(result.current.isEnglish).toBe(false);
    });
  });

  describe('locale switching with persistence', () => {
    it('changes locale from English to Korean', async () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper(),
      });

      expect(result.current.locale).toBe('en');

      await act(async () => {
        await result.current.changeLocale('ko');
      });

      expect(result.current.locale).toBe('ko');
      expect(result.current.isKorean).toBe(true);
      expect(result.current.isEnglish).toBe(false);
    });

    it('changes locale from Korean to English', async () => {
      await act(async () => {
        await changeLocale('ko');
      });

      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper('ko'),
      });

      expect(result.current.locale).toBe('ko');

      await act(async () => {
        await result.current.changeLocale('en');
      });

      expect(result.current.locale).toBe('en');
      expect(result.current.isEnglish).toBe(true);
      expect(result.current.isKorean).toBe(false);
    });

    it('persists locale change to preferences store', async () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper(),
      });

      const setLocaleSpy = jest.spyOn(usePreferencesStore.getState(), 'setLocale');

      await act(async () => {
        await result.current.changeLocale('ko');
      });

      expect(setLocaleSpy).toHaveBeenCalledWith('ko');

      setLocaleSpy.mockRestore();
    });

    it('updates store when switching to English', async () => {
      await act(async () => {
        await changeLocale('ko');
      });

      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper('ko'),
      });

      const setLocaleSpy = jest.spyOn(usePreferencesStore.getState(), 'setLocale');

      await act(async () => {
        await result.current.changeLocale('en');
      });

      expect(setLocaleSpy).toHaveBeenCalledWith('en');

      setLocaleSpy.mockRestore();
    });
  });

  describe('isKorean and isEnglish helpers', () => {
    it('returns correct values for English locale', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isEnglish).toBe(true);
      expect(result.current.isKorean).toBe(false);
    });

    it('returns correct values for Korean locale', async () => {
      await act(async () => {
        await changeLocale('ko');
      });

      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper('ko'),
      });

      expect(result.current.isKorean).toBe(true);
      expect(result.current.isEnglish).toBe(false);
    });

    it('updates helper values after locale change', async () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isEnglish).toBe(true);
      expect(result.current.isKorean).toBe(false);

      await act(async () => {
        await result.current.changeLocale('ko');
      });

      expect(result.current.isKorean).toBe(true);
      expect(result.current.isEnglish).toBe(false);
    });
  });

  describe('multiple rapid switches', () => {
    it('handles multiple locale switches in sequence', async () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper(),
      });

      expect(result.current.locale).toBe('en');

      await act(async () => {
        await result.current.changeLocale('ko');
      });
      expect(result.current.locale).toBe('ko');

      await act(async () => {
        await result.current.changeLocale('en');
      });
      expect(result.current.locale).toBe('en');

      await act(async () => {
        await result.current.changeLocale('ko');
      });
      expect(result.current.locale).toBe('ko');

      await act(async () => {
        await result.current.changeLocale('en');
      });
      expect(result.current.locale).toBe('en');
    });

    it('maintains correct helper states through rapid switches', async () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper(),
      });

      // English state
      expect(result.current.isEnglish).toBe(true);
      expect(result.current.isKorean).toBe(false);

      // Switch to Korean
      await act(async () => {
        await result.current.changeLocale('ko');
      });
      expect(result.current.isKorean).toBe(true);
      expect(result.current.isEnglish).toBe(false);

      // Switch back to English
      await act(async () => {
        await result.current.changeLocale('en');
      });
      expect(result.current.isEnglish).toBe(true);
      expect(result.current.isKorean).toBe(false);

      // Switch to Korean again
      await act(async () => {
        await result.current.changeLocale('ko');
      });
      expect(result.current.isKorean).toBe(true);
      expect(result.current.isEnglish).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles switching to same locale (no-op)', async () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: createWrapper(),
      });

      const initialLocale = result.current.locale;

      await act(async () => {
        await result.current.changeLocale('en');
      });

      expect(result.current.locale).toBe(initialLocale);
    });

    it('provides stable changeLocale function reference', () => {
      const { result, rerender } = renderHook(() => useLocale(), {
        wrapper: createWrapper(),
      });

      const initialChangeLocale = result.current.changeLocale;

      // Trigger a re-render
      rerender(undefined);

      expect(result.current.changeLocale).toBe(initialChangeLocale);
    });
  });
});
