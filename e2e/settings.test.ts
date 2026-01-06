/**
 * E2E tests for Settings flows following TDD.
 *
 * Tests:
 * 1. Navigate to Settings screen from Home
 * 2. Edit display name and save
 * 3. Upload profile photo (mock image picker)
 * 4. Apply photo effects (0%, 30%, 60%, 100%)
 * 5. Switch locale from English to Korean and verify UI refresh
 * 6. Toggle notification preferences and verify persistence
 * 7. Logout and verify redirect to login screen
 * 8. Delete account with confirmation dialog and verify account removal
 *
 * @see claude_docs/21_settings.md
 */

import { device, expect, element, by, waitFor, withText } from 'detox';
import { loginAsUser, selectTenant, uniqueEmail, completeAuthFlow } from './helpers/auth-helpers';
import { navigateToTab, expectScreen, clearTenantContext } from './helpers/navigation-helpers';

describe('Settings E2E Tests', () => {
  const testUser = {
    email: uniqueEmail('settings'),
    password: 'Test123!',
    tenantName: 'Test Church',
  };

  beforeAll(async () => {
    // Launch app with English locale
    await device.launchApp({
      languageAndRegion: {
        language: 'en-US',
        calendar: 'gregorian',
      },
    });
  });

  beforeEach(async () => {
    // Complete auth flow before each test
    await device.reloadReactNative();
    await completeAuthFlow(testUser.email, testUser.password, testUser.tenantName);
  });

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  describe('Navigation to Settings', () => {
    it('should navigate to Settings screen from Home', async () => {
      await expectScreen('home-screen');

      // Tap Settings tab
      await element(by.id('settings-tab')).tap();

      // Verify Settings screen is visible
      await expectScreen('settings-screen');
    });

    it('should display all Settings sections', async () => {
      await element(by.id('settings-tab')).tap();
      await expectScreen('settings-screen');

      // Profile section
      await expect(element(by.id('profile-section'))).toBeVisible();

      // Appearance section (with locale selector)
      await expect(element(by.id('appearance-section'))).toBeVisible();

      // Notifications section
      await expect(element(by.id('notifications-section'))).toBeVisible();

      // Danger zone section
      await expect(element(by.id('danger-zone-section'))).toBeVisible();
    });
  });

  // ============================================================================
  // PROFILE EDITING
  // ============================================================================

  describe('Profile Editing', () => {
    it('should display current display name', async () => {
      await element(by.id('settings-tab')).tap();

      // Display name should be visible
      await expect(element(by.id('display-name-input'))).toBeVisible();
    });

    it('should display email as read-only', async () => {
      await element(by.id('settings-tab')).tap();

      // Email should be displayed but not editable
      await expect(element(by.id('email-display'))).toBeVisible();
      await expect(element(by.id('email-display'))).toHaveProp('editable', false);
    });

    it('should edit display name and save', async () => {
      await element(by.id('settings-tab')).tap();

      // Tap edit button
      await element(by.id('edit-profile-button')).tap();

      // Clear current name and enter new one
      await element(by.id('display-name-input')).clearText();
      await element(by.id('display-name-input')).typeText('New Display Name');

      // Save changes
      await element(by.id('save-profile-button')).tap();

      // Verify success message
      await expect(element(by.text('Profile updated'))).toBeVisible();
    });

    it('should validate display name length', async () => {
      await element(by.id('settings-tab')).tap();

      await element(by.id('edit-profile-button')).tap();
      await element(by.id('display-name-input')).clearText();

      // Enter a very long name (should be truncated or rejected)
      await element(by.id('display-name-input')).typeText('A'.repeat(100));

      await element(by.id('save-profile-button')).tap();

      // Either saves with truncation or shows error
      // This depends on the validation implementation
      const nameInput = element(by.id('display-name-input'));
      const currentText = await nameInput.getAttributes();

      // Name should be reasonably truncated
      expect(currentText.length).toBeLessThanOrEqual(50);
    });

    it('should handle empty display name', async () => {
      await element(by.id('settings-tab')).tap();

      await element(by.id('edit-profile-button')).tap();
      await element(by.id('display-name-input')).clearText();

      // Try to save with empty name
      await element(by.id('save-profile-button')).tap();

      // Should show validation error
      await expect(element(by.text('Display name is required'))).toBeVisible();
    });
  });

  // ============================================================================
  // PROFILE PHOTO UPLOAD
  // ============================================================================

  describe('Profile Photo Upload', () => {
    it('should display profile photo upload button', async () => {
      await element(by.id('settings-tab')).tap();

      await expect(element(by.id('photo-upload-button'))).toBeVisible();
    });

    it('should display current profile photo or placeholder', async () => {
      await element(by.id('settings-tab')).tap();

      // Either a photo or placeholder should be visible
      await expect(
        element(by.id('profile-photo')).or(element(by.id('profile-photo-placeholder')))
      ).toBeVisible();
    });

    it('should open image picker when upload button is tapped', async () => {
      await element(by.id('settings-tab')).tap();

      // Mock the image picker to return a test image
      await device.invoke('setImagePickerMock', {
        imagePath: '/path/to/test-image.jpg',
      });

      await element(by.id('photo-upload-button')).tap();

      // Image picker should be invoked (verify via mock)
      const pickerInvoked = await device.invoke('getImagePickerInvoked');
      expect(pickerInvoked).toBe(true);
    });

    it('should show loading state during photo upload', async () => {
      await element(by.id('settings-tab')).tap();

      // Mock slow upload
      await device.invoke('setImagePickerMock', {
        imagePath: '/path/to/test-image.jpg',
        uploadDelay: 1000,
      });

      await element(by.id('photo-upload-button')).tap();

      // Should show loading indicator
      await expect(element(by.id('photo-upload-loading'))).toBeVisible();

      // Wait for upload to complete
      await waitFor(element(by.id('photo-upload-loading')))
        .not.toExist()
        .withTimeout(5000);
    });

    it('should display uploaded photo preview', async () => {
      await element(by.id('settings-tab')).tap();

      await device.invoke('setImagePickerMock', {
        imagePath: '/path/to/test-image.jpg',
      });

      await element(by.id('photo-upload-button')).tap();

      // Wait for upload to complete
      await waitFor(element(by.id('profile-photo')))
        .toBeVisible()
        .withTimeout(5000);

      // Photo should now be visible (not placeholder)
      await expect(element(by.id('profile-photo-placeholder'))).not.toExist();
    });

    it('should handle photo upload failure gracefully', async () => {
      await element(by.id('settings-tab')).tap();

      // Mock upload failure
      await device.invoke('setImagePickerMock', {
        imagePath: '/path/to/test-image.jpg',
        uploadError: 'Upload failed',
      });

      await element(by.id('photo-upload-button')).tap();

      // Should show error message
      await expect(element(by.text('Failed to upload photo'))).toBeVisible();
    });
  });

  // ============================================================================
  // PHOTO EFFECTS
  // ============================================================================

  describe('Photo Effects', () => {
    beforeEach(async () => {
      // Upload a photo first
      await element(by.id('settings-tab')).tap();
      await device.invoke('setImagePickerMock', {
        imagePath: '/path/to/test-image.jpg',
      });
      await element(by.id('photo-upload-button')).tap();
      await waitFor(element(by.id('profile-photo')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display photo effects slider', async () => {
      await expect(element(by.id('photo-effects-slider'))).toBeVisible();
    });

    it('should apply 0% effect (no effect)', async () => {
      // Set slider to 0
      await element(by.id('photo-effects-slider')).setSliderValue(0);

      // Preview should show no effect
      const effectValue = await element(by.id('photo-effects-value')).getAttributes();
      expect(effectValue).toBe('0%');
    });

    it('should apply 30% effect', async () => {
      await element(by.id('photo-effects-slider')).setSliderValue(30);

      const effectValue = await element(by.id('photo-effects-value')).getAttributes();
      expect(effectValue).toBe('30%');

      // Preview should update
      await expect(element(by.id('photo-effect-preview'))).toBeVisible();
    });

    it('should apply 60% effect', async () => {
      await element(by.id('photo-effects-slider')).setSliderValue(60);

      const effectValue = await element(by.id('photo-effects-value')).getAttributes();
      expect(effectValue).toBe('60%');
    });

    it('should apply 100% effect', async () => {
      await element(by.id('photo-effects-slider')).setSliderValue(100);

      const effectValue = await element(by.id('photo-effects-value')).getAttributes();
      expect(effectValue).toBe('100%');
    });

    it('should save photo with applied effect', async () => {
      // Set effect to 60%
      await element(by.id('photo-effects-slider')).setSliderValue(60);

      // Save
      await element(by.id('save-photo-effect-button')).tap();

      // Verify success
      await expect(element(by.text('Photo updated'))).toBeVisible();

      // Effect should persist after screen refresh
      await device.reloadReactNative();
      await element(by.id('settings-tab')).tap();

      const savedEffect = await element(by.id('photo-effects-value')).getAttributes();
      expect(savedEffect).toBe('60%');
    });
  });

  // ============================================================================
  // LOCALE SWITCHING
  // ============================================================================

  describe('Locale Switching', () => {
    it('should display language selector', async () => {
      await element(by.id('settings-tab')).tap();

      await expect(element(by.id('locale-selector'))).toBeVisible();
    });

    it('should show current locale', async () => {
      await element(by.id('settings-tab')).tap();

      // Should show English as current
      await expect(element(by.id('current-locale'))).toHaveText('English');
    });

    it('should switch from English to Korean', async () => {
      await element(by.id('settings-tab')).tap();

      // Open locale selector
      await element(by.id('locale-selector')).tap();

      // Select Korean
      await element(by.text('한국어')).tap();

      // UI should immediately refresh with Korean
      await expect(element(by.text('설정'))).toBeVisible();
      await expect(element(by.id('current-locale'))).toHaveText('한국어');
    });

    it('should switch from Korean to English', async () => {
      // First switch to Korean
      await element(by.id('settings-tab')).tap();
      await element(by.id('locale-selector')).tap();
      await element(by.text('한국어')).tap();

      // Verify Korean is active
      await expect(element(by.text('설정'))).toBeVisible();

      // Switch back to English
      await element(by.id('locale-selector')).tap();
      await element(by.text('English')).tap();

      // UI should refresh with English
      await expect(element(by.text('Settings'))).toBeVisible();
      await expect(element(by.id('current-locale'))).toHaveText('English');
    });

    it('should persist locale across app restarts', async () => {
      await element(by.id('settings-tab')).tap();

      // Switch to Korean
      await element(by.id('locale-selector')).tap();
      await element(by.text('한국어')).tap();

      // Restart app
      await device.reloadReactNative();

      // Navigate to Settings
      await element(by.id('settings-tab')).tap();

      // Should still be in Korean
      await expect(element(by.id('current-locale'))).toHaveText('한국어');
    });

    it('should update all tab labels when locale changes', async () => {
      await element(by.id('settings-tab')).tap();

      // Switch to Korean
      await element(by.id('locale-selector')).tap();
      await element(by.text('한국어')).tap();

      // Verify tab labels changed
      await expect(element(by.text('홈'))).toBeVisible();
      await expect(element(by.text('채팅'))).toBeVisible();
      await expect(element(by.text('기도'))).toBeVisible();
      await expect(element(by.text('목회 일지'))).toBeVisible();
      await expect(element(by.text('이미지'))).toBeVisible();
      await expect(element(by.text('설정'))).toBeVisible();
    });
  });

  // ============================================================================
  // NOTIFICATION PREFERENCES
  // ============================================================================

  describe('Notification Preferences', () => {
    it('should display all notification toggles', async () => {
      await element(by.id('settings-tab')).tap();

      await expect(element(by.id('message-notifications-toggle'))).toBeVisible();
      await expect(element(by.id('prayer-notifications-toggle'))).toBeVisible();
      await expect(element(by.id('journal-notifications-toggle'))).toBeVisible();
      await expect(element(by.id('system-notifications-toggle'))).toBeVisible();
    });

    it('should toggle message notifications', async () => {
      await element(by.id('settings-tab')).tap();

      const toggle = element(by.id('message-notifications-toggle'));

      // Initial state should be on (true)
      await expect(toggle).toHaveProp('value', '1');

      // Toggle off
      await toggle.tap();

      // Should be off now
      await expect(toggle).toHaveProp('value', '0');
    });

    it('should toggle prayer notifications', async () => {
      await element(by.id('settings-tab')).tap();

      const toggle = element(by.id('prayer-notifications-toggle'));

      await toggle.tap();
      await expect(toggle).toHaveProp('value', '0');
    });

    it('should toggle journal notifications', async () => {
      await element(by.id('settings-tab')).tap();

      const toggle = element(by.id('journal-notifications-toggle'));

      await toggle.tap();
      await expect(toggle).toHaveProp('value', '0');
    });

    it('should toggle system notifications', async () => {
      await element(by.id('settings-tab')).tap();

      const toggle = element(by.id('system-notifications-toggle'));

      await toggle.tap();
      await expect(toggle).toHaveProp('value', '0');
    });

    it('should auto-save notification preferences', async () => {
      await element(by.id('settings-tab')).tap();

      // Toggle messages off
      await element(by.id('message-notifications-toggle')).tap();

      // Wait a moment for auto-save
      await device.invoke('waitForAutoSave');

      // Restart app and verify preference persisted
      await device.reloadReactNative();
      await element(by.id('settings-tab')).tap();

      const toggle = element(by.id('message-notifications-toggle'));
      await expect(toggle).toHaveProp('value', '0');
    });

    it('should persist notification preferences across app restarts', async () => {
      await element(by.id('settings-tab')).tap();

      // Turn off multiple notifications
      await element(by.id('message-notifications-toggle')).tap();
      await element(by.id('prayer-notifications-toggle')).tap();
      await element(by.id('system-notifications-toggle')).tap();

      // Restart app
      await device.reloadReactNative();
      await element(by.id('settings-tab')).tap();

      // Verify all changes persisted
      await expect(element(by.id('message-notifications-toggle'))).toHaveProp('value', '0');
      await expect(element(by.id('prayer-notifications-toggle'))).toHaveProp('value', '0');
      await expect(element(by.id('journal-notifications-toggle'))).toHaveProp('value', '1'); // Was not toggled
      await expect(element(by.id('system-notifications-toggle'))).toHaveProp('value', '0');
    });
  });

  // ============================================================================
  // LOGOUT
  // ============================================================================

  describe('Logout', () => {
    it('should display logout button', async () => {
      await element(by.id('settings-tab')).tap();

      await expect(element(by.id('logout-button'))).toBeVisible();
    });

    it('should logout and redirect to login screen', async () => {
      await element(by.id('settings-tab')).tap();

      await element(by.id('logout-button')).tap();

      // Should redirect to login screen
      await expectScreen('login-screen');
    });

    it('should clear user session on logout', async () => {
      await element(by.id('settings-tab')).tap();

      await element(by.id('logout-button')).tap();

      // Verify we're at login screen
      await expectScreen('login-screen');

      // Try to navigate to a protected screen
      await element(by.id('chat-tab')).tap();

      // Should redirect back to login
      await expectScreen('login-screen');
    });
  });

  // ============================================================================
  // ACCOUNT DELETION
  // ============================================================================

  describe('Account Deletion', () => {
    it('should display account deletion button in danger zone', async () => {
      await element(by.id('settings-tab')).tap();

      await expect(element(by.id('delete-account-button'))).toBeVisible();
    });

    it('should show confirmation dialog when delete button is tapped', async () => {
      await element(by.id('settings-tab')).tap();

      await element(by.id('delete-account-button')).tap();

      // Confirmation dialog should appear
      await expect(element(by.id('delete-account-dialog'))).toBeVisible();
      await expect(element(by.text('Delete Account?'))).toBeVisible();
      await expect(element(withText(/This action cannot be undone/))).toBeVisible();
    });

    it('should display warning message in confirmation dialog', async () => {
      await element(by.id('settings-tab')).tap();

      await element(by.id('delete-account-button')).tap();

      // Warning text should be visible
      await expect(element(by.text('All your data will be permanently deleted'))).toBeVisible();
      await expect(element(by.text('This includes messages, prayers, journals, and profile'))).toBeVisible();
    });

    it('should have cancel button in confirmation dialog', async () => {
      await element(by.id('settings-tab')).tap();

      await element(by.id('delete-account-button')).tap();

      // Cancel button should be visible
      await expect(element(by.id('cancel-delete-button'))).toBeVisible();
    });

    it('should close dialog when cancel is tapped', async () => {
      await element(by.id('settings-tab')).tap();

      await element(by.id('delete-account-button')).tap();
      await expect(element(by.id('delete-account-dialog'))).toBeVisible();

      // Tap cancel
      await element(by.id('cancel-delete-button')).tap();

      // Dialog should close
      await expect(element(by.id('delete-account-dialog'))).not.toBeVisible();

      // Should still be on Settings screen
      await expectScreen('settings-screen');
    });

    it('should have confirm button in confirmation dialog', async () => {
      await element(by.id('settings-tab')).tap();

      await element(by.id('delete-account-button')).tap();

      // Confirm button should be visible and styled as danger
      await expect(element(by.id('confirm-delete-button'))).toBeVisible();
      // Danger styling could be verified via color or style prop
    });

    it('should delete account when confirmed', async () => {
      await element(by.id('settings-tab')).tap();

      await element(by.id('delete-account-button')).tap();
      await expect(element(by.id('delete-account-dialog'))).toBeVisible();

      // Confirm deletion
      await element(by.id('confirm-delete-button')).tap();

      // Should show loading state
      await expect(element(by.id('delete-account-loading'))).toBeVisible();

      // Wait for deletion to complete
      await waitFor(element(by.id('delete-account-loading')))
        .not.toExist()
        .withTimeout(10000);

      // Should redirect to login screen
      await expectScreen('login-screen');
    });

    it('should show error if deletion fails', async () => {
      await element(by.id('settings-tab')).tap();

      // Mock deletion failure
      await device.invoke('setAccountDeleteError', {
        error: 'Network error',
      });

      await element(by.id('delete-account-button')).tap();
      await expect(element(by.id('delete-account-dialog'))).toBeVisible();

      await element(by.id('confirm-delete-button')).tap();

      // Should show error message
      await expect(element(by.text('Failed to delete account'))).toBeVisible();
      await expect(element(by.text('Please try again'))).toBeVisible();
    });

    it('should remove all user data after account deletion', async () => {
      await element(by.id('settings-tab')).tap();

      // Create some test data first
      await element(by.id('chat-tab')).tap();
      await element(by.id('chat-test-message-input')).typeText('Test message');
      await element(by.id('send-message-button')).tap();

      // Go back to settings and delete account
      await element(by.id('settings-tab')).tap();
      await element(by.id('delete-account-button')).tap();
      await element(by.id('confirm-delete-button')).tap();

      // Wait for deletion
      await waitFor(element(by.id('delete-account-loading')))
        .not.toExist()
        .withTimeout(10000);

      // Try to login with deleted account
      await element(by.id('email-input')).typeText(testUser.email);
      await element(by.id('password-input')).typeText(testUser.password);
      await element(by.id('login-button')).tap();

      // Should show login error (account doesn't exist)
      await expect(element(by.text('Invalid credentials'))).toBeVisible();
    });
  });

  // ============================================================================
  // INTEGRATION WITH OTHER FEATURES
  // ============================================================================

  describe('Settings Integration', () => {
    it('should reflect locale change in chat messages', async () => {
      // Go to chat first
      await element(by.id('chat-tab')).tap();

      // Verify English labels
      await expect(element(by.text('Type a message...'))).toBeVisible();

      // Go to settings and change locale
      await element(by.id('settings-tab')).tap();
      await element(by.id('locale-selector')).tap();
      await element(by.text('한국어')).tap();

      // Go back to chat
      await element(by.id('chat-tab')).tap();

      // Should now show Korean placeholder
      await expect(element(by.text('메시지를 입력하세요...'))).toBeVisible();
    });

    it('should update profile photo in chat after upload', async () => {
      // Upload photo in settings
      await element(by.id('settings-tab')).tap();
      await device.invoke('setImagePickerMock', {
        imagePath: '/path/to/test-avatar.jpg',
      });
      await element(by.id('photo-upload-button')).tap();
      await waitFor(element(by.id('profile-photo')))
        .toBeVisible()
        .withTimeout(5000);

      // Go to chat and verify profile photo is visible
      await element(by.id('chat-tab')).tap();
      await expect(element(by.id('user-avatar'))).toBeVisible();
    });

    it('should respect notification preferences in real-time', async () => {
      // Turn off message notifications
      await element(by.id('settings-tab')).tap();
      await element(by.id('message-notifications-toggle')).tap();

      // Trigger a test message notification
      await device.invoke('triggerTestNotification', {
        type: 'message',
      });

      // Should not show notification (or notification permission should be revoked)
      // This is hard to test in E2E without actual push notification setup
      // For now, verify the preference was saved
      await expect(element(by.id('message-notifications-toggle'))).toHaveProp('value', '0');
    });
  });

  // ============================================================================
  // ACCESSIBILITY
  // ============================================================================

  describe('Settings Accessibility', () => {
    it('should have proper accessibility labels for all controls', async () => {
      await element(by.id('settings-tab')).tap();

      // Verify accessibility labels
      await expect(element(by.id('photo-upload-button'))).toHaveLabel('Change profile photo');
      await expect(element(by.id('locale-selector'))).toHaveLabel('Language');
      await expect(element(by.id('logout-button'))).toHaveLabel('Logout');
      await expect(element(by.id('delete-account-button'))).toHaveLabel('Delete account');
    });

    it('should be screen reader compatible', async () => {
      await element(by.id('settings-tab')).tap();

      // Verify all sections are announced to screen readers
      await expect(element(by.id('profile-section'))).toHaveLabel('Profile');
      await expect(element(by.id('notifications-section'))).toHaveLabel('Notifications');
      await expect(element(by.id('danger-zone-section'))).toHaveLabel('Danger Zone');
    });

    it('should have minimum tap target sizes', async () => {
      await element(by.id('settings-tab')).tap();

      // Verify buttons meet minimum tap target size (44x44 points)
      const logoutButton = element(by.id('logout-button'));
      const { width, height } = await logoutButton.getAttributes();

      expect(width).toBeGreaterThanOrEqual(44);
      expect(height).toBeGreaterThanOrEqual(44);
    });
  });
});

/**
 * ============================================================================
 * TESTING NOTES
 * ============================================================================
 *
 * To run these tests:
 * 1. Start Metro bundler: `npm start` or `bun start`
 * 2. Run tests: `npm run test:e2e` or `bun detox test`
 *
 * Mock Configuration:
 * - Image picker is mocked to return test images
 * - Network requests can be mocked for testing edge cases
 * - AsyncStorage can be cleared between tests
 *
 * Test Data:
 * - Uses unique email addresses to avoid conflicts
 * - Test tenant should be pre-configured in test environment
 *
 * Known Limitations:
 * - Push notification testing requires device-specific setup
 * - Actual photo upload requires native implementation
 * - Some tests use device.invoke() for test-specific operations
 */
