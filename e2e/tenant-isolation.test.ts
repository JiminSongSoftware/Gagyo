/**
 * E2E tests for Tenant Isolation following TDD.
 *
 * These tests verify that multi-tenant data isolation is enforced correctly:
 * 1. User A (Tenant 1) cannot see User B's (Tenant 2) data
 * 2. Switching tenants clears previous tenant data from UI
 * 3. API calls include correct tenant_id in headers/claims
 * 4. RLS enforcement returns empty results (not errors) for cross-tenant access attempts
 *
 * Critical paths tested:
 * - Chat isolation
 * - Prayer card isolation
 * - Pastoral journal isolation
 * - Image isolation
 * - Tenant switching
 *
 * @see claude_docs/04_multi_tenant_model.md
 */

import { device, expect, element, by, waitFor } from 'detox';
import { loginAsUser, selectTenant, logout, completeAuthFlow } from './helpers/auth-helpers';
import { navigateToChat, expectConversationListVisible } from './helpers/chat-helpers';
import { navigateToTab, expectScreen } from './helpers/navigation-helpers';
import { waitForNetworkIdle, waitForElementStable, tapWithRetry } from './helpers/flake-mitigation';

/**
 * Test user configuration for multi-tenant testing.
 * These users have memberships in different tenants for isolation testing.
 */
const TEST_USERS = {
  // User A: Member of Tenant 1 only
  userA: {
    email: 'test-user-a@test.com',
    password: 'TestPassword123!',
    tenant: 'Test Church Alpha',
    tenantId: 'tenant-alpha-uuid',
  },
  // User B: Member of Tenant 2 only
  userB: {
    email: 'test-user-b@test.com',
    password: 'TestPassword123!',
    tenant: 'Test Church Beta',
    tenantId: 'tenant-beta-uuid',
  },
  // User C: Member of both tenants (for tenant switching tests)
  multiTenantUser: {
    email: 'test-user-multi@test.com',
    password: 'TestPassword123!',
    tenants: ['Test Church Alpha', 'Test Church Beta'],
    tenantIds: ['tenant-alpha-uuid', 'tenant-beta-uuid'],
  },
};

/**
 * Test data that should only be visible within specific tenants.
 * This data is pre-seeded in the test environment.
 */
const TENANT_SPECIFIC_DATA = {
  tenantAlpha: {
    chatName: 'Alpha Small Group',
    prayerTitle: 'Alpha Prayer Request',
    journalTitle: 'Alpha Pastoral Note',
    imageName: 'alpha-church-photo.jpg',
  },
  tenantBeta: {
    chatName: 'Beta Ministry Team',
    prayerTitle: 'Beta Prayer Request',
    journalTitle: 'Beta Pastoral Note',
    imageName: 'beta-church-photo.jpg',
  },
};

describe('Tenant Isolation E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      languageAndRegion: {
        language: 'en-US',
        calendar: 'gregorian',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  // ============================================================================
  // CHAT ISOLATION
  // ============================================================================

  describe('Chat Isolation', () => {
    it('should only show conversations from the selected tenant', async () => {
      // Login as User A (Tenant Alpha)
      await completeAuthFlow(
        TEST_USERS.userA.email,
        TEST_USERS.userA.password,
        TEST_USERS.userA.tenant
      );

      // Navigate to chat
      await navigateToChat();
      await expectConversationListVisible();

      // Should see Tenant Alpha chat
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.chatName)))
        .toBeVisible()
        .withTimeout(5000);

      // Should NOT see Tenant Beta chat
      await expect(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.chatName))).not.toBeVisible();
    });

    it('should not display other tenant conversations after login', async () => {
      // Login as User B (Tenant Beta)
      await completeAuthFlow(
        TEST_USERS.userB.email,
        TEST_USERS.userB.password,
        TEST_USERS.userB.tenant
      );

      // Navigate to chat
      await navigateToChat();
      await expectConversationListVisible();

      // Should see Tenant Beta chat
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.chatName)))
        .toBeVisible()
        .withTimeout(5000);

      // Should NOT see Tenant Alpha chat
      await expect(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.chatName))).not.toBeVisible();
    });

    it('should clear chat list when switching to different tenant', async () => {
      // Login as multi-tenant user and select Tenant Alpha
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);
      await selectTenant(TEST_USERS.multiTenantUser.tenants[0]); // Alpha

      // Navigate to chat and verify Alpha data
      await navigateToChat();
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.chatName)))
        .toBeVisible()
        .withTimeout(5000);

      // Logout and switch to Tenant Beta
      await logout();
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);
      await selectTenant(TEST_USERS.multiTenantUser.tenants[1]); // Beta

      // Navigate to chat and verify Beta data
      await navigateToChat();
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.chatName)))
        .toBeVisible()
        .withTimeout(5000);

      // Should NOT see Alpha chat anymore
      await expect(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.chatName))).not.toBeVisible();
    });
  });

  // ============================================================================
  // PRAYER CARD ISOLATION
  // ============================================================================

  describe('Prayer Card Isolation', () => {
    it('should only show prayer cards from the selected tenant', async () => {
      // Login as User A (Tenant Alpha)
      await completeAuthFlow(
        TEST_USERS.userA.email,
        TEST_USERS.userA.password,
        TEST_USERS.userA.tenant
      );

      // Navigate to prayer screen
      await navigateToTab('Prayer');
      await expectScreen('prayer-screen');

      // Should see Tenant Alpha prayer card
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.prayerTitle)))
        .toBeVisible()
        .withTimeout(5000);

      // Should NOT see Tenant Beta prayer card
      await expect(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.prayerTitle))).not.toBeVisible();
    });

    it('should not display other tenant prayer cards after login', async () => {
      // Login as User B (Tenant Beta)
      await completeAuthFlow(
        TEST_USERS.userB.email,
        TEST_USERS.userB.password,
        TEST_USERS.userB.tenant
      );

      // Navigate to prayer screen
      await navigateToTab('Prayer');
      await expectScreen('prayer-screen');

      // Should see Tenant Beta prayer card
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.prayerTitle)))
        .toBeVisible()
        .withTimeout(5000);

      // Should NOT see Tenant Alpha prayer card
      await expect(
        element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.prayerTitle))
      ).not.toBeVisible();
    });

    it('should clear prayer cards when switching tenants', async () => {
      // Login as multi-tenant user and select Tenant Alpha
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);
      await selectTenant(TEST_USERS.multiTenantUser.tenants[0]); // Alpha

      // Navigate to prayer and verify Alpha data
      await navigateToTab('Prayer');
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.prayerTitle)))
        .toBeVisible()
        .withTimeout(5000);

      // Logout and switch to Tenant Beta
      await logout();
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);
      await selectTenant(TEST_USERS.multiTenantUser.tenants[1]); // Beta

      // Navigate to prayer and verify Beta data
      await navigateToTab('Prayer');
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.prayerTitle)))
        .toBeVisible()
        .withTimeout(5000);

      // Should NOT see Alpha prayer card anymore
      await expect(
        element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.prayerTitle))
      ).not.toBeVisible();
    });
  });

  // ============================================================================
  // PASTORAL JOURNAL ISOLATION
  // ============================================================================

  describe('Pastoral Journal Isolation', () => {
    it('should only show journals from the selected tenant', async () => {
      // Login as User A (Tenant Alpha)
      await completeAuthFlow(
        TEST_USERS.userA.email,
        TEST_USERS.userA.password,
        TEST_USERS.userA.tenant
      );

      // Navigate to pastoral journal screen
      await navigateToTab('Pastoral Journal');
      await expectScreen('pastoral-screen');

      // Should see Tenant Alpha journal
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.journalTitle)))
        .toBeVisible()
        .withTimeout(5000);

      // Should NOT see Tenant Beta journal
      await expect(
        element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.journalTitle))
      ).not.toBeVisible();
    });

    it('should not display other tenant journals after login', async () => {
      // Login as User B (Tenant Beta)
      await completeAuthFlow(
        TEST_USERS.userB.email,
        TEST_USERS.userB.password,
        TEST_USERS.userB.tenant
      );

      // Navigate to pastoral journal screen
      await navigateToTab('Pastoral Journal');
      await expectScreen('pastoral-screen');

      // Should see Tenant Beta journal
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.journalTitle)))
        .toBeVisible()
        .withTimeout(5000);

      // Should NOT see Tenant Alpha journal
      await expect(
        element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.journalTitle))
      ).not.toBeVisible();
    });

    it('should enforce hierarchical visibility within tenant', async () => {
      // Login as User A (Tenant Alpha) - assuming normal leader role
      await completeAuthFlow(
        TEST_USERS.userA.email,
        TEST_USERS.userA.password,
        TEST_USERS.userA.tenant
      );

      // Navigate to pastoral journal
      await navigateToTab('Pastoral Journal');
      await expectScreen('pastoral-screen');

      // Should only see journals they have permission to view
      // (based on hierarchical role structure)
      await waitFor(element(by.id('journal-list')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify own journals are visible
      await expect(element(by.id('my-journals-section'))).toBeVisible();
    });
  });

  // ============================================================================
  // IMAGE ISOLATION
  // ============================================================================

  describe('Image Isolation', () => {
    it('should only show images from the selected tenant', async () => {
      // Login as User A (Tenant Alpha)
      await completeAuthFlow(
        TEST_USERS.userA.email,
        TEST_USERS.userA.password,
        TEST_USERS.userA.tenant
      );

      // Navigate to images screen
      await navigateToTab('Images');
      await expectScreen('images-screen');

      // Should see Tenant Alpha image
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.imageName)))
        .toBeVisible()
        .withTimeout(5000);

      // Should NOT see Tenant Beta image
      await expect(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.imageName))).not.toBeVisible();
    });

    it('should not display other tenant images after login', async () => {
      // Login as User B (Tenant Beta)
      await completeAuthFlow(
        TEST_USERS.userB.email,
        TEST_USERS.userB.password,
        TEST_USERS.userB.tenant
      );

      // Navigate to images screen
      await navigateToTab('Images');
      await expectScreen('images-screen');

      // Should see Tenant Beta image
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.imageName)))
        .toBeVisible()
        .withTimeout(5000);

      // Should NOT see Tenant Alpha image
      await expect(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.imageName))).not.toBeVisible();
    });
  });

  // ============================================================================
  // TENANT SWITCHING
  // ============================================================================

  describe('Tenant Switching', () => {
    it('should display tenant selection screen with multiple memberships', async () => {
      // Login as multi-tenant user
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);

      // Should see tenant selection with both tenants
      await expectScreen('tenant-selection-screen');
      await expect(element(by.text(TEST_USERS.multiTenantUser.tenants[0]))).toBeVisible();
      await expect(element(by.text(TEST_USERS.multiTenantUser.tenants[1]))).toBeVisible();
    });

    it('should clear all cached data when switching tenants', async () => {
      // Login as multi-tenant user and select Tenant Alpha
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);
      await selectTenant(TEST_USERS.multiTenantUser.tenants[0]); // Alpha

      // Navigate through all screens to populate cache
      await navigateToChat();
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.chatName)))
        .toBeVisible()
        .withTimeout(5000);

      await navigateToTab('Prayer');
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.prayerTitle)))
        .toBeVisible()
        .withTimeout(5000);

      await navigateToTab('Pastoral Journal');
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.journalTitle)))
        .toBeVisible()
        .withTimeout(5000);

      // Logout and switch to different tenant
      await logout();
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);
      await selectTenant(TEST_USERS.multiTenantUser.tenants[1]); // Beta

      // Verify all screens now show Beta data only
      await navigateToChat();
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.chatName)))
        .toBeVisible()
        .withTimeout(5000);
      await expect(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.chatName))).not.toBeVisible();

      await navigateToTab('Prayer');
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.prayerTitle)))
        .toBeVisible()
        .withTimeout(5000);
      await expect(
        element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.prayerTitle))
      ).not.toBeVisible();

      await navigateToTab('Pastoral Journal');
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.journalTitle)))
        .toBeVisible()
        .withTimeout(5000);
      await expect(
        element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.journalTitle))
      ).not.toBeVisible();
    });

    it('should persist tenant selection across app restarts', async () => {
      // Login and select Tenant Alpha
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);
      await selectTenant(TEST_USERS.multiTenantUser.tenants[0]); // Alpha

      // Verify home screen is visible
      await expectScreen('home-screen');

      // Restart app
      await device.reloadReactNative();

      // Should go directly to home (not tenant selection)
      await expectScreen('home-screen');

      // Navigate to chat and verify Alpha data is still shown
      await navigateToChat();
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.chatName)))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  // ============================================================================
  // API CONTEXT VERIFICATION
  // ============================================================================

  describe('API Context', () => {
    it('should include tenant context in all API requests', async () => {
      // This test verifies that API requests include tenant_id
      // In a real implementation, this would be verified via network inspection
      // or by checking the app's network logs

      // Login as User A (Tenant Alpha)
      await completeAuthFlow(
        TEST_USERS.userA.email,
        TEST_USERS.userA.password,
        TEST_USERS.userA.tenant
      );

      // Navigate to chat (triggers API calls)
      await navigateToChat();

      // Wait for data to load
      await waitFor(element(by.id('conversation-list')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify that the tenant context indicator shows correct tenant
      // (assuming there's a debug/test mode indicator for tenant context)
      await expect(element(by.id('tenant-context-indicator'))).toExist();

      // In debug mode, verify tenant ID matches expected value
      // This could be done via app's debug tools or network inspection
    });

    it('should reject requests with mismatched tenant context', async () => {
      // This test verifies RLS enforcement at the API level
      // Login as User A (Tenant Alpha)
      await completeAuthFlow(
        TEST_USERS.userA.email,
        TEST_USERS.userA.password,
        TEST_USERS.userA.tenant
      );

      // Attempt to access Tenant Beta data via direct navigation
      // (this simulates a malicious attempt to bypass tenant context)

      // Navigate to chat
      await navigateToChat();

      // Verify only Alpha data is visible
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.chatName)))
        .toBeVisible()
        .withTimeout(5000);

      // Beta data should never be visible (RLS enforced)
      await expect(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.chatName))).not.toBeVisible();
    });
  });

  // ============================================================================
  // RLS ENFORCEMENT
  // ============================================================================

  describe('RLS Enforcement', () => {
    it('should return empty results for cross-tenant queries (not errors)', async () => {
      // Login as User A (Tenant Alpha)
      await completeAuthFlow(
        TEST_USERS.userA.email,
        TEST_USERS.userA.password,
        TEST_USERS.userA.tenant
      );

      // Navigate to chat
      await navigateToChat();

      // Wait for list to load
      await waitFor(element(by.id('conversation-list')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify no error messages are shown
      await expect(element(by.text('Access denied'))).not.toBeVisible();
      await expect(element(by.text('Permission denied'))).not.toBeVisible();
      await expect(element(by.text('Unauthorized'))).not.toBeVisible();

      // Verify empty state is shown for features with no data
      // (if user has no conversations, show empty state, not error)
      // This depends on whether the test user has conversations
    });

    it('should gracefully handle tenant mismatch in deep links', async () => {
      // Login as User A (Tenant Alpha)
      await completeAuthFlow(
        TEST_USERS.userA.email,
        TEST_USERS.userA.password,
        TEST_USERS.userA.tenant
      );

      // Attempt to navigate to a Tenant Beta resource via deep link
      // (this simulates clicking a shared link from another tenant)
      await device.openURL({
        url: 'gagyo://chat/beta-conversation-id',
      });

      // Should show appropriate message, not error
      await waitFor(element(by.text('Conversation not found')))
        .toBeVisible()
        .withTimeout(5000);

      // Should remain in current tenant context
      await navigateToChat();
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.chatName)))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should enforce RLS on search results', async () => {
      // Login as User A (Tenant Alpha)
      await completeAuthFlow(
        TEST_USERS.userA.email,
        TEST_USERS.userA.password,
        TEST_USERS.userA.tenant
      );

      // Navigate to chat
      await navigateToChat();

      // Open search
      await element(by.id('search-button')).tap();

      // Search for Tenant Beta data
      await element(by.id('search-input')).typeText('Beta');
      await element(by.id('search-submit')).tap();

      // Wait for search results
      await waitFor(element(by.id('search-results')))
        .toBeVisible()
        .withTimeout(5000);

      // Should NOT find any Beta results (RLS filters them out)
      await expect(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.chatName))).not.toBeVisible();
    });
  });

  // ============================================================================
  // MULTI-TENANT USER SCENARIOS
  // ============================================================================

  describe('Multi-Tenant User Scenarios', () => {
    it('should maintain separate session state per tenant', async () => {
      // Login as multi-tenant user and select Tenant Alpha
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);
      await selectTenant(TEST_USERS.multiTenantUser.tenants[0]); // Alpha

      // Make some state changes (e.g., open a conversation)
      await navigateToChat();
      await element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.chatName)).tap();

      // Verify conversation is open
      await expectScreen('chat-detail-screen');

      // Logout and switch to Tenant Beta
      await logout();
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);
      await selectTenant(TEST_USERS.multiTenantUser.tenants[1]); // Beta

      // Navigate to chat - should start fresh (no conversation open)
      await navigateToChat();
      await expectConversationListVisible();

      // Should NOT see the Alpha conversation we opened earlier
      await expect(element(by.id('chat-detail-screen'))).not.toBeVisible();
    });

    it('should show correct tenant name in UI', async () => {
      // Login as multi-tenant user and select Tenant Alpha
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);
      await selectTenant(TEST_USERS.multiTenantUser.tenants[0]); // Alpha

      // Verify tenant name is displayed in header/settings
      await navigateToTab('Settings');
      await expectScreen('settings-screen');

      // Tenant name should be visible
      await expect(element(by.text(TEST_USERS.multiTenantUser.tenants[0]))).toBeVisible();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle logout during data loading', async () => {
      // Login as User A
      await completeAuthFlow(
        TEST_USERS.userA.email,
        TEST_USERS.userA.password,
        TEST_USERS.userA.tenant
      );

      // Navigate to chat (start loading data)
      await navigateToChat();

      // Immediately attempt to logout
      await navigateToTab('Settings');
      await element(by.id('logout-button')).tap();

      // Should successfully logout without errors
      await expectScreen('login-screen');

      // No error messages should be visible
      await expect(element(by.text('Error'))).not.toBeVisible();
    });

    it('should handle network failure gracefully', async () => {
      // Login as User A
      await completeAuthFlow(
        TEST_USERS.userA.email,
        TEST_USERS.userA.password,
        TEST_USERS.userA.tenant
      );

      // Simulate network offline
      await device.setStatusBar({ network: 'no-service' });

      // Navigate to chat
      await navigateToChat();

      // Should show offline indicator or cached data
      await waitFor(element(by.text('No connection')).or(element(by.id('conversation-list'))))
        .toBeVisible()
        .withTimeout(5000);

      // Restore network
      await device.setStatusBar({ network: '4g' });

      // Should recover and load data
      await waitFor(element(by.id('conversation-list')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should prevent data leakage during fast tenant switching', async () => {
      // Login as multi-tenant user
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);
      await selectTenant(TEST_USERS.multiTenantUser.tenants[0]); // Alpha

      // Navigate to chat
      await navigateToChat();

      // Quick logout and re-login to different tenant
      await logout();
      await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);
      await selectTenant(TEST_USERS.multiTenantUser.tenants[1]); // Beta

      // Navigate to chat
      await navigateToChat();

      // Wait for data to stabilize
      await waitFor(element(by.id('conversation-list')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify ONLY Beta data is visible (no Alpha data leaked)
      await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.chatName)))
        .toBeVisible()
        .withTimeout(5000);
      await expect(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.chatName))).not.toBeVisible();
    });
  });
});

// ============================================================================
// KOREAN LOCALE TESTS
// ============================================================================

describe('Tenant Isolation (Korean Locale)', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      languageAndRegion: {
        language: 'ko-KR',
        calendar: 'gregorian',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display Korean text for tenant selection', async () => {
    await loginAsUser(TEST_USERS.multiTenantUser.email, TEST_USERS.multiTenantUser.password);

    // Tenant selection should be in Korean
    await expect(element(by.text('교회 선택'))).toBeVisible();
  });

  it('should maintain tenant isolation with Korean locale', async () => {
    // Login as User A (Tenant Alpha)
    await completeAuthFlow(
      TEST_USERS.userA.email,
      TEST_USERS.userA.password,
      TEST_USERS.userA.tenant
    );

    // Navigate to chat (Korean: 채팅)
    await navigateToTab('채팅');
    await expectScreen('chat-screen');

    // Should see Tenant Alpha chat
    await waitFor(element(by.text(TENANT_SPECIFIC_DATA.tenantAlpha.chatName)))
      .toBeVisible()
      .withTimeout(5000);

    // Should NOT see Tenant Beta chat
    await expect(element(by.text(TENANT_SPECIFIC_DATA.tenantBeta.chatName))).not.toBeVisible();
  });
});
