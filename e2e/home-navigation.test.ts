import { device, expect, element, by } from 'detox';
import {
  completeAuthFlow,
  selectTenant,
  loginAsUser,
} from './helpers/auth-helpers';
import {
  navigateToTab,
  expectScreen,
  completeAuthAndExpectHome,
  expectAllTabsVisible,
} from './helpers/navigation-helpers';

/**
 * E2E tests for Home Screen Navigation
 *
 * These tests define the expected user journey for tab navigation,
 * dashboard rendering, and tenant context enforcement.
 *
 * Tests follow TDD approach - written before implementation.
 */

describe('Home Screen Navigation', () => {
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

  it('should display home screen after authentication', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');
    await expect(element(by.id('dashboard-title'))).toBeVisible();
  });

  it('should show all navigation tabs', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');
    await expectAllTabsVisible('en');
  });

  it('should navigate to chat tab when tapped', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');
    await navigateToTab('Chat');
    await expectScreen('chat-screen');
  });

  it('should navigate to prayer tab when tapped', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');
    await navigateToTab('Prayer');
    await expectScreen('prayer-screen');
  });

  it('should navigate to pastoral tab when tapped', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');
    await navigateToTab('Pastoral Journal');
    await expectScreen('pastoral-screen');
  });

  it('should navigate to images tab when tapped', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');
    await navigateToTab('Images');
    await expectScreen('images-screen');
  });

  it('should navigate to settings tab when tapped', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');
    await navigateToTab('Settings');
    await expectScreen('settings-screen');
  });

  it('should navigate back to home from any tab', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');

    // Navigate to Chat
    await navigateToTab('Chat');

    // Navigate back to Home
    await navigateToTab('Home');
    await expectScreen('home-screen');
  });

  it('should display dashboard widgets', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');

    await expect(element(by.id('recent-conversations-widget'))).toBeVisible();
    await expect(element(by.id('prayer-summary-widget'))).toBeVisible();
    await expect(element(by.id('pastoral-status-widget'))).toBeVisible();
  });

  it('should show tenant name in welcome message', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');

    // Welcome message should contain the tenant name
    await expect(element(by.text(/Welcome to Test Church 1/))).toBeVisible();
  });

  it('should display quick action buttons', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');

    await expect(element(by.text('Quick Actions'))).toBeVisible();
    await expect(element(by.text('Start Conversation'))).toBeVisible();
    await expect(element(by.text('Create Prayer Card'))).toBeVisible();
    await expect(element(by.text('Write Journal Entry'))).toBeVisible();
  });

  it('should navigate to chat when tapping Start Conversation', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');

    await element(by.text('Start Conversation')).tap();
    await expectScreen('chat-screen');
  });

  it('should navigate to prayer when tapping Create Prayer Card', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');

    await element(by.text('Create Prayer Card')).tap();
    await expectScreen('prayer-screen');
  });

  it('should navigate to pastoral when tapping Write Journal Entry', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');

    await element(by.text('Write Journal Entry')).tap();
    await expectScreen('pastoral-screen');
  });
});

describe('Home Screen i18n', () => {
  it('should display Korean navigation labels', async () => {
    await device.launchApp({
      languageAndRegion: {
        language: 'ko-KR',
        calendar: 'gregorian',
      },
    });

    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');
    await expectAllTabsVisible('ko');
  });

  it('should display Korean dashboard labels', async () => {
    await device.launchApp({
      languageAndRegion: {
        language: 'ko-KR',
        calendar: 'gregorian',
      },
    });

    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');

    await expect(element(by.text('대시보드'))).toBeVisible();
    await expect(element(by.text('빠른 작업'))).toBeVisible();
    await expect(element(by.text('최근 대화'))).toBeVisible();
    await expect(element(by.text('기도 카드'))).toBeVisible();
    await expect(element(by.text('목회 일지'))).toBeVisible();
  });

  it('should display Korean welcome message', async () => {
    await device.launchApp({
      languageAndRegion: {
        language: 'ko-KR',
        calendar: 'gregorian',
      },
    });

    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');

    // Welcome message in Korean
    await expect(element(by.text(/Test Church 1에 오신 것을 환영합니다/))).toBeVisible();
  });

  it('should display Korean quick action labels', async () => {
    await device.launchApp({
      languageAndRegion: {
        language: 'ko-KR',
        calendar: 'gregorian',
      },
    });

    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');

    await expect(element(by.text('대화 시작'))).toBeVisible();
    await expect(element(by.text('기도 카드 작성'))).toBeVisible();
    await expect(element(by.text('일지 작성'))).toBeVisible();
  });
});

describe('Tab Navigation State', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should maintain tab state after navigation', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');

    // Navigate to Chat
    await navigateToTab('Chat');

    // Navigate to Prayer
    await navigateToTab('Prayer');

    // Navigate back to Chat - should still be accessible
    await navigateToTab('Chat');
    await expectScreen('chat-screen');
  });

  it('should preserve tenant context across tab navigation', async () => {
    await completeAuthAndExpectHome('admin@test.com', 'password', 'Test Church 1');

    // Navigate through multiple tabs
    await navigateToTab('Chat');
    await navigateToTab('Prayer');
    await navigateToTab('Home');

    // Tenant name should still be displayed
    await expect(element(by.text(/Test Church 1/))).toBeVisible();
  });
});
