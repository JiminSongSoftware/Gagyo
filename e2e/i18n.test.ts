/**
 * E2E tests for i18n flows following TDD.
 *
 * Tests:
 * 1. Initial locale detection based on device settings
 * 2. Locale switching through settings
 * 3. Translation display across screens
 * 4. Persistence across app restarts
 * 5. Fallback behavior for missing translations
 * 6. Date/number formatting based on locale
 */

import { device, expect, element, by, waitFor, withText } from 'detox';

describe('i18n E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      languageAndRegion: {
        language: 'en-US',
        calendar: 'gregorian',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Initial locale detection', () => {
    it('should display English text when device language is English', async () => {
      // Launch app with English locale
      await device.launchApp({
        languageAndRegion: {
          language: 'en-US',
          calendar: 'gregorian',
        },
      });

      // Wait for app to load
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Should display English text
      await expect(element(by.text('Gagyo'))).toBeVisible();
    });

    it('should display Korean text when device language is Korean', async () => {
      // Launch app with Korean locale
      await device.launchApp({
        languageAndRegion: {
          language: 'ko-KR',
          calendar: 'gregorian',
        },
      });

      // Wait for app to load
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Should display Korean text
      await expect(element(by.text('가교'))).toBeVisible();
    });

    it('should fall back to English for unsupported device locale', async () => {
      // Launch app with unsupported locale
      await device.launchApp({
        languageAndRegion: {
          language: 'fr-FR',
          calendar: 'gregorian',
        },
      });

      // Wait for app to load
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Should fallback to English
      await expect(element(by.text('Gagyo'))).toBeVisible();
    });
  });

  describe('Locale switching through settings', () => {
    beforeEach(async () => {
      // Reset to English before each test
      await device.launchApp({
        languageAndRegion: {
          language: 'en-US',
          calendar: 'gregorian',
        },
      });
    });

    it('should switch from English to Korean', async () => {
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to settings (adjust selector based on actual implementation)
      await element(by.id('settings-button')).tap();
      
      // Wait for settings screen
      await waitFor(element(by.id('settings-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Tap language selector
      await element(by.id('language-selector')).tap();

      // Select Korean
      await element(by.text('한국어')).tap();

      // Go back to main screen
      await element(by.id('back-button')).tap();

      // Should now display Korean text
      await expect(element(by.text('가교'))).toBeVisible();
      await expect(element(by.text('저장'))).toBeVisible();
    });

    it('should switch from Korean to English', async () => {
      // Start with Korean
      await device.launchApp({
        languageAndRegion: {
          language: 'ko-KR',
          calendar: 'gregorian',
        },
      });

      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to settings
      await element(by.id('settings-button')).tap();
      
      await waitFor(element(by.id('settings-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Tap language selector
      await element(by.id('language-selector')).tap();

      // Select English
      await element(by.text('English')).tap();

      // Go back to main screen
      await element(by.id('back-button')).tap();

      // Should now display English text
      await expect(element(by.text('Gagyo'))).toBeVisible();
      await expect(element(by.text('Save'))).toBeVisible();
    });

    it('should update all UI elements when locale changes', async () => {
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Open a screen with multiple translatable elements
      await element(by.id('chat-screen-button')).tap();

      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify English text is visible
      await expect(element(by.text('Send'))).toBeVisible();
      await expect(element(by.text('Type a message...'))).toBeVisible();

      // Go to settings and change locale
      await element(by.id('settings-button')).tap();
      await element(by.id('language-selector')).tap();
      await element(by.text('한국어')).tap();
      await element(by.id('back-button')).tap();

      // Navigate back to chat screen
      await element(by.id('chat-screen-button')).tap();

      // Verify Korean text is now visible
      await expect(element(by.text('보내기'))).toBeVisible();
      await expect(element(by.text('메시지를 입력하세요...'))).toBeVisible();
    });
  });

  describe('Persistence across app restarts', () => {
    it('should remember selected locale after app restart', async () => {
      // Start with English
      await device.launchApp({
        languageAndRegion: {
          language: 'en-US',
          calendar: 'gregorian',
        },
      });

      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Switch to Korean
      await element(by.id('settings-button')).tap();
      await element(by.id('language-selector')).tap();
      await element(by.text('한국어')).tap();
      await element(by.id('back-button')).tap();

      // Verify Korean is displayed
      await expect(element(by.text('가교'))).toBeVisible();

      // Restart the app
      await device.reloadReactNative();

      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Should still be in Korean
      await expect(element(by.text('가교'))).toBeVisible();
      await expect(element(by.text('저장'))).toBeVisible();
    });

    it('should persist locale preference across multiple sessions', async () => {
      // First session: set to Korean
      await device.launchApp({
        languageAndRegion: {
          language: 'en-US',
          calendar: 'gregorian',
        },
      });

      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('settings-button')).tap();
      await element(by.id('language-selector')).tap();
      await element(by.text('한국어')).tap();
      await element(by.id('back-button')).tap();

      // Second session: verify
      await device.reloadReactNative();
      await expect(element(by.text('가교'))).toBeVisible();

      // Third session: verify again
      await device.reloadReactNative();
      await expect(element(by.text('가교'))).toBeVisible();
    });
  });

  describe('Translation display across screens', () => {
    it('should display translated text on home screen', async () => {
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // English: verify common translations
      await expect(element(by.text('Gagyo'))).toBeVisible();

      // Switch to Korean
      await element(by.id('settings-button')).tap();
      await element(by.id('language-selector')).tap();
      await element(by.text('한국어')).tap();
      await element(by.id('back-button')).tap();

      // Korean: verify translations
      await expect(element(by.text('가교'))).toBeVisible();
    });

    it('should display translated text on chat list screen', async () => {
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to chat list
      await element(by.id('chat-list-button')).tap();

      await waitFor(element(by.id('chat-list-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // English
      await expect(element(by.text('Chats'))).toBeVisible();

      // Switch to Korean
      await element(by.id('settings-button')).tap();
      await element(by.id('language-selector')).tap();
      await element(by.text('한국어')).tap();
      await element(by.id('back-button')).tap();

      // Go back to chat list
      await element(by.id('chat-list-button')).tap();

      // Korean
      await expect(element(by.text('채팅'))).toBeVisible();
    });

    it('should display translated error messages', async () => {
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Trigger an error (this will depend on actual app implementation)
      await element(by.id('trigger-error-button')).tap();

      // English error
      await expect(element(by.text('An error occurred'))).toBeVisible();

      // Switch to Korean
      await element(by.id('settings-button')).tap();
      await element(by.id('language-selector')).tap();
      await element(by.text('한국어')).tap();
      await element(by.id('back-button')).tap();

      // Trigger error again
      await element(by.id('trigger-error-button')).tap();

      // Korean error
      await expect(element(by.text('오류가 발생했습니다'))).toBeVisible();
    });
  });

  describe('Fallback behavior', () => {
    it('should show English translation when Korean translation is missing', async () => {
      // Switch to Korean
      await device.launchApp({
        languageAndRegion: {
          language: 'ko-KR',
          calendar: 'gregorian',
        },
      });

      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to a screen that might have missing translations
      await element(by.id('settings-screen-button')).tap();

      // Look for English fallback text (keys that only exist in English)
      // This will depend on which keys you've set up for testing
      await expect(element(by.text('This key only exists in English'))).toBeVisible();
    });

    it('should show key name when translation is completely missing', async () => {
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // This tests the scenario where a key doesn't exist in any locale
      // The app should display the key itself as a fallback
      // You would need a test element with a missing key
      // await expect(element(by.text('common.nonexistent_key'))).toBeVisible();
    });
  });

  describe('Date and number formatting', () => {
    it('should format dates according to locale', async () => {
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to a screen with dates
      await element(by.id('profile-screen-button')).tap();

      // English date format (e.g., "January 15, 2024")
      await expect(element(withText(/January/))).toBeVisible();

      // Switch to Korean
      await element(by.id('settings-button')).tap();
      await element(by.id('language-selector')).tap();
      await element(by.text('한국어')).tap();
      await element(by.id('back-button')).tap();

      // Go back to profile screen
      await element(by.id('profile-screen-button')).tap();

      // Korean date format (e.g., "2024년 1월 15일")
      await expect(element(withText(/2024년/))).toBeVisible();
    });

    it('should format numbers according to locale', async () => {
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to a screen with numbers
      await element(by.id('stats-screen-button')).tap();

      // Both English and Korean typically use same digit grouping
      // but this tests that the formatting function is being called
      await expect(element(withText(/1,234/))).toBeVisible();
    });

    it('should display relative time in correct language', async () => {
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to chat screen with timestamps
      await element(by.id('chat-screen-button')).tap();

      // English: "1 minute ago", "5 minutes ago", etc.
      await expect(element(withText(/minute/))).toBeVisible();

      // Switch to Korean
      await element(by.id('settings-button')).tap();
      await element(by.id('language-selector')).tap();
      await element(by.text('한국어')).tap();
      await element(by.id('back-button')).tap();

      // Go back to chat screen
      await element(by.id('chat-screen-button')).tap();

      // Korean: "1분 전", "5분 전", etc.
      await expect(element(withText(/분 전/))).toBeVisible();
    });
  });

  describe('Rapid locale switching', () => {
    it('should handle rapid locale changes without errors', async () => {
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to settings
      await element(by.id('settings-button')).tap();
      await element(by.id('language-selector')).tap();

      // Rapidly switch between locales
      await element(by.text('한국어')).tap();
      await element(by.id('back-button')).tap();

      await element(by.id('settings-button')).tap();
      await element(by.id('language-selector')).tap();
      await element(by.text('English')).tap();
      await element(by.id('back-button')).tap();

      await element(by.id('settings-button')).tap();
      await element(by.id('language-selector')).tap();
      await element(by.text('한국어')).tap();
      await element(by.id('back-button')).tap();

      // Should display Korean without errors
      await expect(element(by.text('가교'))).toBeVisible();
    });
  });

  describe('Accessibility with i18n', () => {
    it('should have correct accessibility labels in each locale', async () => {
      await waitFor(element(by.id('app-root')))
        .toBeVisible()
        .withTimeout(5000);

      // English accessibility label
      const saveButtonEn = element(by.id('save-button'));
      await expect(saveButtonEn).toHaveLabel('Save');

      // Switch to Korean
      await element(by.id('settings-button')).tap();
      await element(by.id('language-selector')).tap();
      await element(by.text('한국어')).tap();
      await element(by.id('back-button')).tap();

      // Korean accessibility label
      const saveButtonKo = element(by.id('save-button'));
      await expect(saveButtonKo).toHaveLabel('저장');
    });
  });
});
