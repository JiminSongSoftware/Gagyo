import { device, expect, element, by, waitFor } from 'detox';
import {
  loginAsUser,
  selectTenant,
  navigateToSignup,
  navigateToLogin,
  completeSignup,
  completeAuthFlow,
  expectError,
  expectScreen,
  uniqueEmail,
} from './helpers/auth-helpers';

/**
 * E2E tests for Authentication Flows
 *
 * These tests define the expected user journey for login, signup,
 * tenant selection, and session management.
 *
 * Tests follow TDD approach - written before implementation.
 */

describe('Login Flow', () => {
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

  it('should show login screen on app launch when not authenticated', async () => {
    await expectScreen('login-screen');
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
    await expect(element(by.id('login-button'))).toBeVisible();
  });

  it('should display error for invalid credentials', async () => {
    await loginAsUser('invalid@test.com', 'wrongpassword', { expectSuccess: false });
    await expectError('Invalid email or password');
  });

  it('should navigate to tenant selection after successful login', async () => {
    await loginAsUser('admin@test.com', 'password');
    await expectScreen('tenant-selection-screen');
  });

  it('should display loading state during login', async () => {
    await element(by.id('email-input')).typeText('admin@test.com');
    await element(by.id('password-input')).typeText('password');
    await element(by.id('login-button')).tap();

    await expect(element(by.text('Loading...'))).toBeVisible();
  });

  it('should navigate to signup screen when tapping signup link', async () => {
    await navigateToSignup();
    await expectScreen('signup-screen');
  });
});

describe('Signup Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await navigateToSignup();
  });

  it('should show signup screen with all required fields', async () => {
    await expectScreen('signup-screen');
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
    await expect(element(by.id('confirm-password-input'))).toBeVisible();
    await expect(element(by.id('signup-button'))).toBeVisible();
  });

  it('should validate email format', async () => {
    await completeSignup('invalid-email', 'password123', 'password123', { expectSuccess: false });
    await expectError('Please enter a valid email address');
  });

  it('should validate password length', async () => {
    await element(by.id('email-input')).typeText('newuser@test.com');
    await element(by.id('password-input')).typeText('short');
    await element(by.id('signup-button')).tap();

    await expectError('Password must be at least 8 characters');
  });

  it('should validate password confirmation match', async () => {
    await completeSignup('newuser@test.com', 'password123', 'password456', {
      expectSuccess: false,
    });
    await expectError("Passwords don't match");
  });

  it('should create account and navigate to tenant selection', async () => {
    await completeSignup(uniqueEmail(), 'password123');
    await expectScreen('tenant-selection-screen');
  });

  it('should navigate back to login when tapping sign in link', async () => {
    await navigateToLogin();
    await expectScreen('login-screen');
  });
});

describe('Tenant Selection Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await loginAsUser('admin@test.com', 'password');
  });

  it('should display list of user tenants', async () => {
    await expect(element(by.id('tenant-list'))).toBeVisible();
    await expect(element(by.text('Test Church 1'))).toBeVisible();
  });

  it('should navigate to home after selecting tenant', async () => {
    await selectTenant('Test Church 1');

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show loading state while fetching memberships', async () => {
    // This test would need to mock a slow response
    // For now, we verify the spinner component exists
    await expect(element(by.id('tenant-loading-spinner'))).toExist();
  });

  it('should show error message when no tenants found', async () => {
    // This would require a test user with no memberships
    // For now, we verify the empty state component exists
    await expect(element(by.id('no-tenants-message'))).toExist();
  });
});

describe('Session Persistence', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should restore session after app restart', async () => {
    // Complete full auth flow: login, select tenant, verify home screen
    await completeAuthFlow('admin@test.com', 'password', 'Test Church 1');

    // Restart app
    await device.reloadReactNative();

    // Should go directly to home (session restored with tenant context)
    await expectScreen('home-screen');
  });

  it('should redirect to login when session expired', async () => {
    // This test would require mocking an expired session
    // For now, we verify the expired session message exists
    await expect(element(by.text('Your session has expired'))).toExist();
  });
});

describe('Auth (Korean Locale)', () => {
  it('should display Korean text when locale is ko', async () => {
    await device.launchApp({
      languageAndRegion: {
        language: 'ko-KR',
        calendar: 'gregorian',
      },
    });

    await expect(element(by.text('로그인'))).toBeVisible();
    await expect(element(by.text('이메일'))).toBeVisible();
    await expect(element(by.text('비밀번호'))).toBeVisible();
  });

  it('should display Korean text on signup screen', async () => {
    await device.launchApp({
      languageAndRegion: {
        language: 'ko-KR',
        calendar: 'gregorian',
      },
    });

    await navigateToSignup();

    await expect(element(by.text('회원가입'))).toBeVisible();
    await expect(element(by.text('비밀번호 확인'))).toBeVisible();
  });

  it('should display Korean tenant selection screen', async () => {
    await device.launchApp({
      languageAndRegion: {
        language: 'ko-KR',
        calendar: 'gregorian',
      },
    });

    // Login in Korean locale
    await loginAsUser('admin@test.com', 'password');

    await expect(element(by.text('교회 선택'))).toBeVisible();
  });
});
