import { element, by, waitFor } from 'detox';
import { settle, waitForVisible, safeTap, safeType } from './flake-helpers';

/**
 * Reusable helper functions for authentication E2E tests.
 *
 * These functions encapsulate common auth actions to reduce
 * test code duplication and improve maintainability.
 *
 * Updated to use flake mitigation utilities for more reliable tests.
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

  // Use safe typing with settle delays
  await safeType(element(by.id('email-input')), email);
  await safeType(element(by.id('password-input')), password);
  await safeTap(element(by.id('login-button')));

  if (expectSuccess) {
    await waitForVisible(element(by.id('tenant-selection-screen')), { timeout });
  }
}

/**
 * Select a tenant from the tenant selection screen.
 *
 * @param tenantName - The name of the tenant to select
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 5000ms)
 */
export async function selectTenant(tenantName: string, options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await waitForVisible(element(by.id('tenant-selection-screen')), { timeout });
  await safeTap(element(by.text(tenantName)));
  await settle();
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
export async function expectError(message: string, options: { timeout?: number } = {}) {
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
export async function completeAuthFlow(email: string, password: string, tenantName: string) {
  await loginAsUser(email, password);
  await selectTenant(tenantName);

  // Use flake mitigation for home screen verification
  await waitForVisible(element(by.id('home-screen')), { timeout: 5000 });
}

// ============================================================================
// MULTI-TENANT TESTING HELPERS
// ============================================================================

/**
 * Configuration for multi-tenant test users.
 * These users have memberships in different tenants for isolation testing.
 */
export interface TenantTestUser {
  email: string;
  password: string;
  tenant: string;
  tenantId?: string;
}

/**
 * Configuration for users with multiple tenant memberships.
 */
export interface MultiTenantTestUser {
  email: string;
  password: string;
  tenants: string[];
  tenantIds?: string[];
}

/**
 * Login and select a specific tenant for multi-tenant testing.
 * Useful when testing isolation between tenants.
 *
 * @param user - The tenant test user configuration
 * @param options - Optional configuration
 * @param options.verifyHome - Whether to verify home screen after login (default: true)
 */
export async function loginToTenant(user: TenantTestUser, options: { verifyHome?: boolean } = {}) {
  const { verifyHome = true } = options;

  await loginAsUser(user.email, user.password);
  await selectTenant(user.tenant);

  if (verifyHome) {
    await waitForVisible(element(by.id('home-screen')), { timeout: 5000 });
  }
}

/**
 * Switch to a different tenant for the same user.
 * Requires logout and re-login to change tenant context.
 *
 * @param user - The multi-tenant test user
 * @param targetTenantIndex - Index of the tenant to switch to (0-based)
 */
export async function switchTenant(user: MultiTenantTestUser, targetTenantIndex: number) {
  if (targetTenantIndex >= user.tenants.length) {
    throw new Error(
      `Invalid tenant index: ${targetTenantIndex}. User has ${user.tenants.length} tenants.`
    );
  }

  await logout();
  await loginAsUser(user.email, user.password);
  await selectTenant(user.tenants[targetTenantIndex]);

  await waitForVisible(element(by.id('home-screen')), { timeout: 5000 });
}

/**
 * Verify that data is only visible for the current tenant.
 *
 * @param visibleData - Data that should be visible (current tenant)
 * @param hiddenData - Data that should NOT be visible (other tenants)
 * @param timeout - Timeout for visibility checks (default: 5000ms)
 */
export async function verifyTenantIsolation(
  visibleData: string[],
  hiddenData: string[],
  timeout: number = 5000
) {
  // Verify visible data using flake mitigation
  for (const data of visibleData) {
    await waitForVisible(element(by.text(data)), { timeout });
  }

  // Verify hidden data is not visible
  for (const data of hiddenData) {
    await expect(element(by.text(data))).not.toBeVisible();
  }
}

/**
 * Get the current tenant context from the app.
 * Useful for debugging tenant isolation issues.
 *
 * @returns The current tenant name or undefined if not set
 */
export async function getCurrentTenantContext(): Promise<string | undefined> {
  try {
    const indicator = element(by.id('tenant-context-indicator'));
    const attributes = await indicator.getAttributes();
    return (attributes as { text?: string }).text;
  } catch {
    return undefined;
  }
}

/**
 * Verify that the tenant selection screen shows expected tenants.
 *
 * @param expectedTenants - Array of tenant names that should be visible
 * @param timeout - Timeout for visibility checks (default: 5000ms)
 */
export async function verifyTenantSelectionOptions(
  expectedTenants: string[],
  timeout: number = 5000
) {
  await waitForVisible(element(by.id('tenant-selection-screen')), { timeout });

  for (const tenant of expectedTenants) {
    await expect(element(by.text(tenant))).toBeVisible();
  }
}
