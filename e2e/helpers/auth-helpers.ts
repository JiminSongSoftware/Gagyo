import { element, by, waitFor } from 'detox';

/**
 * Reusable helper functions for authentication E2E tests.
 *
 * These functions encapsulate common auth actions to reduce
 * test code duplication and improve maintainability.
 */

/**
 * Login as a user with email and password.
 *
 * @param email - User email address
 * @param password - User password
 * @param options - Optional configuration
 * @param options.expectSuccess - Whether to expect successful login (default: true)
 * @param options.timeout - Timeout for tenant selection screen (default: 5000ms)
 */
export async function loginAsUser(
  email: string,
  password: string,
  options: { expectSuccess?: boolean; timeout?: number } = {}
) {
  const { expectSuccess = true, timeout = 5000 } = options;

  await element(by.id('email-input')).typeText(email);
  await element(by.id('password-input')).typeText(password);
  await element(by.id('login-button')).tap();

  if (expectSuccess) {
    await waitFor(element(by.id('tenant-selection-screen')))
      .toBeVisible()
      .withTimeout(timeout);
  }
}

/**
 * Select a tenant from the tenant selection screen.
 *
 * @param tenantName - The name of the tenant to select
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 5000ms)
 */
export async function selectTenant(
  tenantName: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.id('tenant-selection-screen')))
    .toBeVisible()
    .withTimeout(timeout);

  await element(by.text(tenantName)).tap();
}

/**
 * Navigate to the signup screen from login.
 */
export async function navigateToSignup() {
  await element(by.id('signup-link')).tap();

  await waitFor(element(by.id('signup-screen')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Navigate to the login screen from signup.
 */
export async function navigateToLogin() {
  await element(by.text('Sign In')).tap();

  await waitFor(element(by.id('login-screen')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Complete the signup flow with given credentials.
 *
 * @param email - User email address
 * @param password - User password
 * @param confirmPassword - Password confirmation (defaults to password)
 * @param options - Optional configuration
 * @param options.expectSuccess - Whether to expect successful signup (default: true)
 */
export async function completeSignup(
  email: string,
  password: string,
  confirmPassword?: string,
  options: { expectSuccess?: boolean } = {}
) {
  const { expectSuccess = true } = options;

  await element(by.id('email-input')).typeText(email);
  await element(by.id('password-input')).typeText(password);
  await element(by.id('confirm-password-input')).typeText(confirmPassword ?? password);
  await element(by.id('signup-button')).tap();

  if (expectSuccess) {
    await waitFor(element(by.id('tenant-selection-screen')))
      .toBeVisible()
      .withTimeout(5000);
  }
}

/**
 * Logout from the current session.
 *
 * Note: This requires a logout button to be accessible
 * from the current screen. Implementation depends on
 * where the logout button is placed in the UI.
 */
export async function logout() {
  // Navigate to settings (assuming settings tab exists)
  await element(by.id('settings-tab')).tap();

  // Tap logout button
  await element(by.id('logout-button')).tap();

  // Verify we're back at login screen
  await waitFor(element(by.id('login-screen')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Clear all input fields on the current screen.
 * Useful between tests when staying on the same screen.
 */
export async function clearInputs() {
  await element(by.id('email-input')).clearText();
  await element(by.id('password-input')).clearText();

  // Only clear confirm password if we're on signup screen
  const confirmPasswordInput = element(by.id('confirm-password-input'));
  try {
    await confirmPasswordInput.clearText();
  } catch {
    // Element doesn't exist, we're not on signup screen
  }
}

/**
 * Wait for and verify an error message is displayed.
 *
 * @param message - The error message text to look for
 * @param options - Optional configuration
 * @param options.timeout - Timeout for error appearance (default: 3000ms)
 */
export async function expectError(
  message: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 3000 } = options;

  await waitFor(element(by.text(message)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify the current screen by checking for a specific element.
 *
 * @param screenId - The testID of the screen to verify
 */
export async function expectScreen(screenId: string) {
  await expect(element(by.id(screenId))).toBeVisible();
}

/**
 * Create a user with a unique email based on timestamp.
 * Useful for avoiding conflicts in tests.
 *
 * @param prefix - Email prefix (default: 'test')
 * @returns A unique email address
 */
export function uniqueEmail(prefix: string = 'test'): string {
  return `${prefix}+${Date.now()}@test.com`;
}

/**
 * Complete a full auth flow: login, select tenant, verify home screen.
 *
 * @param email - User email address
 * @param password - User password
 * @param tenantName - Name of the tenant to select
 */
export async function completeAuthFlow(
  email: string,
  password: string,
  tenantName: string
) {
  await loginAsUser(email, password);
  await selectTenant(tenantName);

  await waitFor(element(by.id('home-screen')))
    .toBeVisible()
    .withTimeout(5000);
}
