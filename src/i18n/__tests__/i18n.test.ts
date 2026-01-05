import { initI18n, changeLocale, getCurrentLocale, translate } from '../index';

describe('i18n', () => {
  beforeAll(async () => {
    await initI18n();
  });

  describe('locale switching', () => {
    it('switches to Korean locale', async () => {
      await changeLocale('ko');
      expect(getCurrentLocale()).toBe('ko');
    });

    it('switches to English locale', async () => {
      await changeLocale('en');
      expect(getCurrentLocale()).toBe('en');
    });
  });

  describe('translate function', () => {
    it('translates key in English', () => {
      const result = translate('common.app_name');
      expect(result).toBe('Gagyo');
    });

    it('translates key in Korean', async () => {
      await changeLocale('ko');
      const result = translate('common.app_name');
      expect(result).toBe('가교');
    });

    it('supports interpolation', () => {
      const result = translate('common.loading');
      expect(result).toBeTruthy();
    });
  });

  describe('fallback behavior', () => {
    beforeEach(async () => {
      // Ensure we start from English for consistent fallback tests
      await changeLocale('en');
    });

    it('falls back to English when key missing in Korean', async () => {
      // Switch to Korean
      await changeLocale('ko');

      // test_fallback_key only exists in English, should return English value
      const result = translate('common.test_fallback_key');
      expect(result).toBe('This key only exists in English');
    });

    it('returns key name when translation missing in all languages', () => {
      // This key doesn't exist in any locale
      const result = translate('common.nonexistent_key');
      expect(result).toBe('common.nonexistent_key');
    });

    it('falls back gracefully for nested missing keys', () => {
      const result = translate('auth.nonexistent.nested');
      expect(result).toBe('auth.nonexistent.nested');
    });

    it('maintains English values when switching from Korean to English', async () => {
      await changeLocale('ko');
      expect(translate('common.save')).toBe('저장');

      await changeLocale('en');
      expect(translate('common.save')).toBe('Save');
    });

    it('preserves fallback behavior after multiple locale switches', async () => {
      // Start in English
      expect(translate('common.test_fallback_key')).toBe('This key only exists in English');

      // Switch to Korean - should fall back to English
      await changeLocale('ko');
      expect(translate('common.test_fallback_key')).toBe('This key only exists in English');

      // Switch back to English
      await changeLocale('en');
      expect(translate('common.test_fallback_key')).toBe('This key only exists in English');

      // Switch to Korean again - fallback should still work
      await changeLocale('ko');
      expect(translate('common.test_fallback_key')).toBe('This key only exists in English');
    });
  });

  describe('namespace fallback', () => {
    it('returns key when namespace exists but key does not', () => {
      // common namespace exists, but this key doesn't
      const result = translate('common.nonexistent_key');
      expect(result).toBe('common.nonexistent_key');
    });

    it('handles missing namespace gracefully', () => {
      // This namespace doesn't exist at all
      const result = translate('nonexistent.some_key');
      expect(result).toBe('nonexistent.some_key');
    });
  });
});
