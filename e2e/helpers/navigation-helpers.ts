import { element, by, waitFor } from 'detox';
import { completeAuthFlow } from './auth-helpers';

/**
 * Reusable helper functions for navigation E2E tests.
 *
 * These functions encapsulate common navigation actions to reduce
 * test code duplication and improve maintainability.
 */

/**
 * Navigate to a specific tab by name.
 *
 * @param tabName - The display name of the tab to tap (e.g., 'Chat', 'Prayer')
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 3000ms)
 */
export async function navigateToTab(
  tabName: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 3000 } = options;

  await element(by.text(tabName)).tap();

  // Explicit mapping from tab display names to screen testIDs
  // Screen testIDs follow the pattern: {filename}-screen
  const tabToScreenId: Record<string, string> = {
    'Home': 'home-screen',
    'Chat': 'chat-screen',
    'Prayer': 'prayer-screen',
    'Pastoral Journal': 'pastoral-screen',
    'Images': 'images-screen',
    'Settings': 'settings-screen',
    // Korean labels for i18n tests
    '홈': 'home-screen',
    '채팅': 'chat-screen',
    '기도': 'prayer-screen',
    '목회 일지': 'pastoral-screen',
    '이미지': 'images-screen',
    '설정': 'settings-screen',
  };

  const screenId = tabToScreenId[tabName];
  if (!screenId) {
    throw new Error(`Unknown tab: ${tabName}`);
  }
  await waitFor(element(by.id(screenId)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify the current screen by checking for a specific element.
 *
 * @param screenId - The testID of the screen to verify
 * @param options - Optional configuration
 * @param options.timeout - Timeout for verification (default: 5000ms)
 */
export async function expectScreen(
  screenId: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.id(screenId)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Complete authentication and verify home screen is visible.
 *
 * @param email - User email address
 * @param password - User password
 * @param tenantName - Name of the tenant to select
 */
export async function completeAuthAndExpectHome(
  email: string,
  password: string,
  tenantName: string
) {
  await completeAuthFlow(email, password, tenantName);
  await expectScreen('home-screen');
}

/**
 * Clear tenant context from AsyncStorage.
 *
 * Note: This requires a test-specific logout button or direct AsyncStorage access.
 * For now, this is a placeholder - actual implementation depends on test infrastructure.
 */
export async function clearTenantContext() {
  // Navigate to settings and logout, or directly clear AsyncStorage
  // This would typically involve:
  // 1. Navigate to settings tab
  // 2. Tap logout button
  // Or use a test-specific utility to clear AsyncStorage directly

  await element(by.text('Settings')).tap();
  await element(by.id('logout-button')).tap();

  // Verify redirect to login
  await waitFor(element(by.id('login-screen')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Verify all navigation tabs are visible.
 *
 * @param locale - Optional locale to verify tab labels (default: 'en')
 */
export async function expectAllTabsVisible(locale: 'en' | 'ko' = 'en') {
  const tabLabels = locale === 'en'
    ? ['Home', 'Chat', 'Prayer', 'Pastoral Journal', 'Images', 'Settings']
    : ['홈', '채팅', '기도', '목회 일지', '이미지', '설정'];

  for (const label of tabLabels) {
    await expect(element(by.text(label))).toBeVisible();
  }
}
