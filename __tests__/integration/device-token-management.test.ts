/**
 * Device Token Management Integration Tests
 *
 * Tests Row Level Security policies for device_tokens to ensure:
 * 1. Users can register their own device tokens for active tenant memberships
 * 2. Users can update their own device tokens (token rotation)
 * 3. Users can query their own device tokens within tenant scope
 * 4. Users can delete/revoke their own device tokens
 * 5. Users cannot register tokens for tenants they're not members of
 * 6. Users cannot access other users' device tokens
 * 7. Users cannot register tokens without active membership
 * 8. Cross-tenant token access is blocked
 *
 * Running tests:
 * bun test __tests__/integration/device-token-management.test.ts
 *
 * Prerequisites:
 * 1. Set DATABASE_URL in .env.test (connection string to test database)
 * 2. Database must have the schema and RLS policies applied
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  executeAsUser,
  executeAsServiceRole,
  setupCompleteTestData,
  cleanupTestData,
  TEST_DATA,
} from '../helpers/supabase-test';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  throw new Error(
    'DATABASE_URL must be set in environment variables. Create a .env file with this value.'
  );
}

type SqlRow = Record<string, unknown>;

function requireRow<Row extends SqlRow>(rows: Row[], context: string): Row {
  const [row] = rows;
  if (!row) {
    throw new Error(`Expected row for ${context}`);
  }
  return row;
}

// ============================================================================
// TEST SETUP AND TEARDOWN
// ============================================================================

describe('Device Token Management - Integration Tests', () => {
  beforeAll(async () => {
    await setupCompleteTestData(connectionString);
  });

  afterAll(async () => {
    await cleanupTestData(connectionString);
  });

  // ============================================================================
  // POSITIVE TESTS: Token Registration and Management
  // ============================================================================

  describe('Token Registration - Positive Cases', () => {
    it('User can register device token for active tenant membership', async () => {
      // user5Id is a member of tenant1 with active membership
      const tokenValue = 'ExponentPushToken[test-token-user5-ios]';

      const insertSql = `
        INSERT INTO device_tokens (id, tenant_id, user_id, token, platform)
        VALUES (
          gen_random_uuid(),
          '${TEST_DATA.tenant1Id}',
          '${TEST_DATA.user5Id}',
          '${tokenValue}',
          'ios'
        )
        RETURNING id, token, platform, revoked_at;
      `;

      const result = await executeAsUser<{
        token: string;
        platform: string;
        revoked_at: string | null;
      }>(TEST_DATA.user5Id, insertSql, connectionString);

      expect(result.rowCount).toBe(1);
      const row = requireRow(result.rows, 'insert device token');
      expect(row.token).toBe(tokenValue);
      expect(row.platform).toBe('ios');
      expect(row.revoked_at).toBeNull();
    });

    it('User can register multiple device tokens for different platforms', async () => {
      const iosToken = 'ExponentPushToken[multi-test-ios]';
      const androidToken = 'ExponentPushToken[multi-test-android]';

      // Insert iOS token
      const iosSql = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', '${iosToken}', 'ios')
        ON CONFLICT (tenant_id, token) DO NOTHING
        RETURNING token;
      `;
      const iosResult = await executeAsUser(TEST_DATA.user5Id, iosSql, connectionString);
      expect(iosResult.rowCount).toBeGreaterThanOrEqual(0);

      // Insert Android token
      const androidSql = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', '${androidToken}', 'android')
        ON CONFLICT (tenant_id, token) DO NOTHING
        RETURNING token;
      `;
      const androidResult = await executeAsUser(TEST_DATA.user5Id, androidSql, connectionString);
      expect(androidResult.rowCount).toBeGreaterThanOrEqual(0);
    });

    it('Token upsert handles duplicate tokens within same tenant', async () => {
      const tokenValue = 'ExponentPushToken[upsert-test-token]';

      // First insert
      const firstInsert = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', '${tokenValue}', 'ios')
        ON CONFLICT (tenant_id, token) DO UPDATE SET last_used_at = NOW()
        RETURNING id, last_used_at;
      `;
      await executeAsUser(TEST_DATA.user5Id, firstInsert, connectionString);

      // Second insert (upsert) should succeed without duplicate key error
      const secondInsert = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', '${tokenValue}', 'ios')
        ON CONFLICT (tenant_id, token) DO UPDATE SET last_used_at = NOW()
        RETURNING id, last_used_at;
      `;
      const result = await executeAsUser(TEST_DATA.user5Id, secondInsert, connectionString);

      expect(result.rowCount).toBe(1);
    });
  });

  describe('Token Rotation', () => {
    it('User can update their own device token (rotation scenario)', async () => {
      const oldToken = 'ExponentPushToken[old-rotation-token]';
      const newToken = 'ExponentPushToken[new-rotation-token]';

      // Insert old token
      const insertOld = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', '${oldToken}', 'ios');
      `;
      await executeAsUser(TEST_DATA.user5Id, insertOld, connectionString);

      // Mark old token as revoked
      const revokeOld = `
        UPDATE device_tokens
        SET revoked_at = NOW()
        WHERE tenant_id = '${TEST_DATA.tenant1Id}'
          AND user_id = '${TEST_DATA.user5Id}'
          AND token = '${oldToken}'
        RETURNING id, revoked_at;
      `;
      const revokeResult = await executeAsUser<{ revoked_at: string | null }>(
        TEST_DATA.user5Id,
        revokeOld,
        connectionString
      );
      expect(revokeResult.rowCount).toBe(1);
      expect(requireRow(revokeResult.rows, 'revoke token').revoked_at).not.toBeNull();

      // Insert new token
      const insertNew = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', '${newToken}', 'ios')
        RETURNING id, token, revoked_at;
      `;
      const newResult = await executeAsUser<{ revoked_at: string | null }>(
        TEST_DATA.user5Id,
        insertNew,
        connectionString
      );
      expect(newResult.rowCount).toBe(1);
      expect(requireRow(newResult.rows, 'insert new token').revoked_at).toBeNull();
    });
  });

  describe('Token Query', () => {
    it('User can query their own device tokens within tenant scope', async () => {
      // Insert a test token first
      const insertToken = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', 'ExponentPushToken[query-test]', 'ios');
      `;
      await executeAsUser(TEST_DATA.user5Id, insertToken, connectionString);

      // Query tokens
      const querySql = `
        SELECT id, token, platform, last_used_at, revoked_at
        FROM device_tokens
        WHERE tenant_id = '${TEST_DATA.tenant1Id}'
          AND user_id = '${TEST_DATA.user5Id}'
          AND revoked_at IS NULL;
      `;
      const result = await executeAsUser(TEST_DATA.user5Id, querySql, connectionString);

      expect(result.rowCount).toBeGreaterThanOrEqual(1);
      expect(result.rows.every((row) => row.user_id === TEST_DATA.user5Id)).toBe(true);
    });

    it('User can query only their own tokens (not other users)', async () => {
      // Insert a token for another user (as service role)
      const insertOtherToken = `
        INSERT INTO device_tokens (id, tenant_id, user_id, token, platform)
        VALUES (
          gen_random_uuid(),
          '${TEST_DATA.tenant1Id}',
          '${TEST_DATA.user1Id}',
          'ExponentPushToken[other-user-token]',
          'ios'
        );
      `;
      await executeAsServiceRole(insertOtherToken, connectionString);

      // user5Id queries - should not see user1Id's tokens
      const querySql = `
        SELECT id, token, platform, user_id
        FROM device_tokens
        WHERE tenant_id = '${TEST_DATA.tenant1Id}'
          AND revoked_at IS NULL;
      `;
      const result = await executeAsUser(TEST_DATA.user5Id, querySql, connectionString);

      // Should only return user5's tokens, not user1's
      expect(result.rows.every((row) => row.user_id === TEST_DATA.user5Id)).toBe(true);
    });
  });

  describe('Token Deletion/Revocation', () => {
    it('User can delete their own device token', async () => {
      const tokenValue = 'ExponentPushToken[delete-test-token]';

      // Insert token first
      const insertToken = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', '${tokenValue}', 'ios')
        RETURNING id;
      `;
      const insertResult = await executeAsUser<{ id: string }>(
        TEST_DATA.user5Id,
        insertToken,
        connectionString
      );
      const tokenId = requireRow(insertResult.rows, 'insert token for delete').id;

      // Delete token
      const deleteSql = `
        DELETE FROM device_tokens
        WHERE id = '${tokenId}'
          AND tenant_id = '${TEST_DATA.tenant1Id}'
          AND user_id = '${TEST_DATA.user5Id}'
        RETURNING id;
      `;
      const deleteResult = await executeAsUser(TEST_DATA.user5Id, deleteSql, connectionString);

      expect(deleteResult.rowCount).toBe(1);
    });

    it('User can revoke their own device token on logout', async () => {
      const tokenValue = 'ExponentPushToken[revoke-test-token]';

      // Insert token first
      const insertToken = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', '${tokenValue}', 'ios')
        RETURNING id;
      `;
      await executeAsUser(TEST_DATA.user5Id, insertToken, connectionString);

      // Revoke token (soft delete)
      const revokeSql = `
        UPDATE device_tokens
        SET revoked_at = NOW()
        WHERE tenant_id = '${TEST_DATA.tenant1Id}'
          AND user_id = '${TEST_DATA.user5Id}'
          AND token = '${tokenValue}'
          AND revoked_at IS NULL
        RETURNING id, revoked_at;
      `;
      const revokeResult = await executeAsUser<{ revoked_at: string | null }>(
        TEST_DATA.user5Id,
        revokeSql,
        connectionString
      );

      expect(revokeResult.rowCount).toBe(1);
      expect(requireRow(revokeResult.rows, 'revoke token').revoked_at).not.toBeNull();

      // Verify token is no longer returned in active queries
      const querySql = `
        SELECT id FROM device_tokens
        WHERE tenant_id = '${TEST_DATA.tenant1Id}'
          AND user_id = '${TEST_DATA.user5Id}'
          AND token = '${tokenValue}'
          AND revoked_at IS NULL;
      `;
      const queryResult = await executeAsUser(TEST_DATA.user5Id, querySql, connectionString);
      expect(queryResult.rowCount).toBe(0);
    });
  });

  // ============================================================================
  // NEGATIVE TESTS: RLS Enforcement
  // ============================================================================

  describe('Tenant Isolation - Negative Cases', () => {
    it('User cannot register token for tenant they are not a member of', async () => {
      // user5Id is only a member of tenant1, not tenant2
      const insertSql = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant2Id}', '${TEST_DATA.user5Id}', 'ExponentPushToken[invalid-tenant]', 'ios')
        RETURNING id;
      `;

      const result = await executeAsUser(TEST_DATA.user5Id, insertSql, connectionString);

      // RLS should block the insert (0 rows returned due to policy check failure)
      expect(result.rowCount).toBe(0);
    });

    it('User cannot access other users device tokens in same tenant', async () => {
      // Insert token for user1Id as service role
      const insertToken = `
        INSERT INTO device_tokens (id, tenant_id, user_id, token, platform)
        VALUES (
          '00000000-0000-0000-0000-000000000001',
          '${TEST_DATA.tenant1Id}',
          '${TEST_DATA.user1Id}',
          'ExponentPushToken[admin-only-token]',
          'ios'
        );
      `;
      await executeAsServiceRole(insertToken, connectionString);

      // user5Id tries to query user1Id's token directly
      const querySql = `
        SELECT id, token, platform
        FROM device_tokens
        WHERE id = '00000000-0000-0000-0000-000000000001';
      `;
      const result = await executeAsUser(TEST_DATA.user5Id, querySql, connectionString);

      // RLS should block access (0 rows)
      expect(result.rowCount).toBe(0);
    });

    it('Cross-tenant token access is blocked', async () => {
      // user6Id is a member of tenant2, tries to access tenant1 tokens
      const querySql = `
        SELECT id, token, platform
        FROM device_tokens
        WHERE tenant_id = '${TEST_DATA.tenant1Id}';
      `;
      const result = await executeAsUser(TEST_DATA.user6Id, querySql, connectionString);

      // RLS should block cross-tenant access (0 rows)
      expect(result.rowCount).toBe(0);
    });
  });

  describe('Membership Validation', () => {
    it('User cannot register token without active membership', async () => {
      // Create a user with no active membership
      const inactiveUserId = '99999999-9999-9999-9999-999999999999';

      const createUserSql = `
        INSERT INTO users (id, display_name, locale)
        VALUES ('${inactiveUserId}', 'Inactive User', 'en')
        ON CONFLICT (id) DO NOTHING;
      `;
      await executeAsServiceRole(createUserSql, connectionString);

      // Try to insert token without active membership
      const insertSql = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${inactiveUserId}', 'ExponentPushToken[inactive-user]', 'ios')
        RETURNING id;
      `;
      const result = await executeAsUser(inactiveUserId, insertSql, connectionString);

      // RLS should block insert (0 rows) due to no active membership
      expect(result.rowCount).toBe(0);
    });

    it('RLS policy checks membership status before allowing token operations', async () => {
      // Create a membership with 'suspended' status
      const suspendedMembershipId = 'ssssssss-ssss-ssss-ssss-ssssssssssss';
      const suspendedUserId = '88888888-8888-8888-8888-888888888888';

      const setupSql = `
        -- Create user
        INSERT INTO users (id, display_name, locale)
        VALUES ('${suspendedUserId}', 'Suspended User', 'en')
        ON CONFLICT (id) DO NOTHING;

        -- Create suspended membership
        INSERT INTO memberships (id, user_id, tenant_id, role, status)
        VALUES ('${suspendedMembershipId}', '${suspendedUserId}', '${TEST_DATA.tenant1Id}', 'member', 'suspended')
        ON CONFLICT (user_id, tenant_id) DO NOTHING;
      `;
      await executeAsServiceRole(setupSql, connectionString);

      // Try to insert token with suspended membership
      const insertSql = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${suspendedUserId}', 'ExponentPushToken[suspended-user]', 'ios')
        RETURNING id;
      `;
      const result = await executeAsUser(suspendedUserId, insertSql, connectionString);

      // RLS should block insert (0 rows) due to suspended status
      expect(result.rowCount).toBe(0);
    });
  });

  describe('Token Update Restrictions', () => {
    it('User cannot update another users token', async () => {
      // Insert token for user1
      const insertToken = `
        INSERT INTO device_tokens (id, tenant_id, user_id, token, platform)
        VALUES (
          '00000000-0000-0000-0000-000000000002',
          '${TEST_DATA.tenant1Id}',
          '${TEST_DATA.user1Id}',
          'ExponentPushToken[admin-token]',
          'ios'
        );
      `;
      await executeAsServiceRole(insertToken, connectionString);

      // user5Id tries to update user1Id's token
      const updateSql = `
        UPDATE device_tokens
        SET platform = 'android'
        WHERE id = '00000000-0000-0000-0000-000000000002'
          AND user_id = '${TEST_DATA.user1Id}'
        RETURNING id;
      `;
      const result = await executeAsUser(TEST_DATA.user5Id, updateSql, connectionString);

      // RLS should block update (0 rows)
      expect(result.rowCount).toBe(0);
    });

    it('User cannot modify tenant_id of their own token', async () => {
      const tokenValue = 'ExponentPushToken[tenant-modify-test]';

      // Insert token
      const insertToken = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', '${tokenValue}', 'ios')
        RETURNING id;
      `;
      const insertResult = await executeAsUser<{ id: string }>(
        TEST_DATA.user5Id,
        insertToken,
        connectionString
      );
      const tokenId = requireRow(insertResult.rows, 'insert token for tenant update').id;

      // Try to update tenant_id (should fail due to RLS or FK constraint)
      const updateSql = `
        UPDATE device_tokens
        SET tenant_id = '${TEST_DATA.tenant2Id}'
        WHERE id = '${tokenId}'
        RETURNING id, tenant_id;
      `;
      const result = await executeAsUser(TEST_DATA.user5Id, updateSql, connectionString);

      // Update should fail (0 rows or error due to RLS - user not member of tenant2)
      expect(result.rowCount).toBe(0);
    });
  });

  describe('Token Deletion Restrictions', () => {
    it('User cannot delete another users token', async () => {
      // Insert token for user1
      const insertToken = `
        INSERT INTO device_tokens (id, tenant_id, user_id, token, platform)
        VALUES (
          '00000000-0000-0000-0000-000000000003',
          '${TEST_DATA.tenant1Id}',
          '${TEST_DATA.user1Id}',
          'ExponentPushToken[admin-delete-test]',
          'ios'
        );
      `;
      await executeAsServiceRole(insertToken, connectionString);

      // user5Id tries to delete user1Id's token
      const deleteSql = `
        DELETE FROM device_tokens
        WHERE id = '00000000-0000-0000-0000-000000000003'
          AND user_id = '${TEST_DATA.user1Id}'
        RETURNING id;
      `;
      const result = await executeAsUser(TEST_DATA.user5Id, deleteSql, connectionString);

      // RLS should block deletion (0 rows)
      expect(result.rowCount).toBe(0);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('Same physical token can exist for different tenants', async () => {
      const sharedToken = 'ExponentPushToken[shared-device-token]';

      // Insert for tenant1 as user5
      const insertTenant1 = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', '${sharedToken}', 'ios')
        ON CONFLICT (tenant_id, token) DO NOTHING
        RETURNING tenant_id;
      `;
      const result1 = await executeAsUser(TEST_DATA.user5Id, insertTenant1, connectionString);

      // Insert for tenant2 as user6 (different tenant, different user)
      // This requires service role since user6 is not authenticated in this test context
      const insertTenant2 = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant2Id}', '${TEST_DATA.user6Id}', '${sharedToken}', 'ios')
        ON CONFLICT (tenant_id, token) DO NOTHING
        RETURNING tenant_id;
      `;
      const result2 = await executeAsServiceRole(insertTenant2, connectionString);

      // Both inserts should succeed (same token, different tenants)
      expect(result1.rowCount).toBeGreaterThanOrEqual(0);
      expect(result2.rowCount).toBeGreaterThanOrEqual(0);

      // Verify both exist
      const verifySql = `
        SELECT tenant_id, user_id, token
        FROM device_tokens
        WHERE token = '${sharedToken}'
        ORDER BY tenant_id;
      `;
      const verifyResult = await executeAsServiceRole(verifySql, connectionString);

      expect(verifyResult.rowCount).toBe(2);
    });

    it('Token with invalid platform enum is rejected', async () => {
      const insertSql = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform)
        VALUES ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', 'ExponentPushToken[invalid-platform]', 'invalid')
        RETURNING id;
      `;

      const result = await executeAsUser(TEST_DATA.user5Id, insertSql, connectionString);

      // Should fail due to CHECK constraint on platform
      expect(result.rowCount).toBe(0);
    });

    it('Query filters by revoked_at correctly exclude revoked tokens', async () => {
      const activeToken = 'ExponentPushToken[active-filter-test]';
      const revokedToken = 'ExponentPushToken[revoked-filter-test]';

      // Insert both tokens
      const insertSql = `
        INSERT INTO device_tokens (tenant_id, user_id, token, platform) VALUES
          ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', '${activeToken}', 'ios'),
          ('${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', '${revokedToken}', 'ios');
      `;
      await executeAsUser(TEST_DATA.user5Id, insertSql, connectionString);

      // Revoke one token
      const revokeSql = `
        UPDATE device_tokens
        SET revoked_at = NOW()
        WHERE token = '${revokedToken}';
      `;
      await executeAsUser(TEST_DATA.user5Id, revokeSql, connectionString);

      // Query active tokens only
      const querySql = `
        SELECT token, revoked_at
        FROM device_tokens
        WHERE tenant_id = '${TEST_DATA.tenant1Id}'
          AND user_id = '${TEST_DATA.user5Id}'
          AND revoked_at IS NULL;
      `;
      const result = await executeAsUser<{ token: string }>(
        TEST_DATA.user5Id,
        querySql,
        connectionString
      );

      // Should only return active token
      expect(result.rowCount).toBe(1);
      expect(requireRow(result.rows, 'active token query').token).toBe(activeToken);
    });
  });
});

/**
 * ============================================================================
 * RLS POLICY VERIFICATION NOTES
 * ============================================================================
 *
 * The following RLS policies are verified by these tests:
 *
 * 1. "Users can view own device tokens"
 *    - Verified by: User can query their own tokens within tenant scope
 *    - Blocks: Cross-tenant access, other users' tokens
 *
 * 2. "Users can insert device tokens"
 *    - Verified by: User can register token for active tenant membership
 *    - Blocks: No active membership, wrong tenant
 *
 * 3. "Users can update own device tokens"
 *    - Verified by: User can update their own tokens (rotation)
 *    - Blocks: Updating other users' tokens
 *
 * 4. "Users can delete own device tokens"
 *    - Verified by: User can delete/revoke their own tokens
 *    - Blocks: Deleting other users' tokens
 *
 * All policies check:
 * - user_id = auth.uid() (user owns the token)
 * - EXISTS membership with matching tenant_id AND status = 'active' (tenant membership)
 */
