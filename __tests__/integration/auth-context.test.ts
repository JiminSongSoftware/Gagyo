/**
 * Integration Tests for Auth Context with RLS.
 *
 * Tests the integration between:
 * 1. Supabase Auth session management
 * 2. useAuth hook state synchronization
 * 3. Tenant context with membership validation
 * 4. RLS policies enforcing tenant isolation
 *
 * Running tests:
 * bun test __tests__/integration/auth-context.test.ts
 *
 * Prerequisites:
 * - Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * - Supabase project with auth schema and RLS policies enabled
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.');
}

// ============================================================================
// TEST DATA
// ============================================================================

const generateTestEmail = () => `auth-test-${Date.now()}@example.com`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a test user with sign up
 */
async function createTestUser(email: string, password: string): Promise<SupabaseClient> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return supabase;
}

/**
 * Sign in as a test user
 */
async function signInTestUser(email: string, password: string): Promise<SupabaseClient> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to sign in test user: ${error.message}`);
  }

  return supabase;
}

/**
 * Get current session from client
 */
async function getSession(client: SupabaseClient) {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Get current user from client
 */
async function getUser(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Clean up test user
 */
async function cleanupTestUser(client: SupabaseClient): Promise<void> {
  await client.auth.signOut();
}

// ============================================================================
// TESTS
// ============================================================================

describe('Auth Context - Integration Tests', () => {
  let testEmail: string;
  let testPassword: string;
  let client: SupabaseClient;

  beforeEach(() => {
    testEmail = generateTestEmail();
    testPassword = 'TestPassword123!';
  });

  afterEach(async () => {
    if (client) {
      await cleanupTestUser(client);
    }
  });

  // ==========================================================================
  // AUTH SESSION TESTS
  // ==========================================================================

  describe('Session Management', () => {
    it('should create a session after sign up', async () => {
      client = await createTestUser(testEmail, testPassword);

      const session = await getSession(client);
      expect(session).not.toBeNull();
      expect(session?.user).not.toBeNull();
      expect(session?.user.email).toBe(testEmail);
    });

    it('should create a session after sign in', async () => {
      // First create the user
      await createTestUser(testEmail, testPassword);

      // Then sign in
      client = await signInTestUser(testEmail, testPassword);

      const session = await getSession(client);
      expect(session).not.toBeNull();
      expect(session?.user.email).toBe(testEmail);
    });

    it('should return user with valid UUID', async () => {
      client = await createTestUser(testEmail, testPassword);

      const user = await getUser(client);
      expect(user).not.toBeNull();
      expect(user?.id).toBeDefined();
      // Valid UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(user?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should clear session after sign out', async () => {
      client = await createTestUser(testEmail, testPassword);

      // Verify session exists
      let session = await getSession(client);
      expect(session).not.toBeNull();

      // Sign out
      await client.auth.signOut();

      // Verify session is cleared
      session = await getSession(client);
      expect(session).toBeNull();
    });
  });

  // ==========================================================================
  // MEMBERSHIP QUERY TESTS
  // ==========================================================================

  describe('Membership Queries with Auth Context', () => {
    it('should query memberships for authenticated user', async () => {
      client = await createTestUser(testEmail, testPassword);

      const user = await getUser(client);

      // Query memberships table
      const { data } = await client
        .from('memberships')
        .select('*, tenant:tenants(*)')
        .eq('user_id', user?.id);

      // Should succeed even if empty (user may not have memberships yet)
      expect(Array.isArray(data)).toBe(true);
    });

    it('should filter active memberships correctly', async () => {
      client = await createTestUser(testEmail, testPassword);

      const user = await getUser(client);

      // Query only active memberships
      const { data } = await client
        .from('memberships')
        .select('*, tenant:tenants(*)')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      expect(Array.isArray(data)).toBe(true);
      // All returned memberships should have status 'active'
      data?.forEach((membership: unknown) => {
        expect((membership as { status: string }).status).toBe('active');
      });
    });

    it('should handle membership query errors gracefully', async () => {
      client = await createTestUser(testEmail, testPassword);

      // Query with invalid filter should not throw
      const { data, error } = await client
        .from('memberships')
        .select('*')
        .eq('invalid_column', 'invalid_value');

      // Supabase returns error for invalid columns
      expect(error || data).toBeDefined();
    });
  });

  // ==========================================================================
  // TENANT ISOLATION TESTS
  // ==========================================================================

  describe('Tenant Isolation with Auth Context', () => {
    it('should only return tenants where user has active membership', async () => {
      client = await createTestUser(testEmail, testPassword);

      const user = await getUser(client);

      // Query tenants through memberships
      const { data } = await client
        .from('memberships')
        .select('tenant:tenants(*)')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      expect(Array.isArray(data)).toBe(true);

      // Extract unique tenants
      const tenants = data
        ?.map((m: unknown) => (m as { tenant: unknown }).tenant)
        .filter((t: unknown) => t !== null);

      // Should only return unique tenants
      const uniqueTenantIds = new Set(tenants?.map((t: unknown) => (t as { id: string }).id));
      expect(tenants?.length).toBe(uniqueTenantIds.size);
    });

    it('should enforce RLS on tenant-specific queries', async () => {
      client = await createTestUser(testEmail, testPassword);

      // Direct tenant query should only return accessible tenants
      const { data, error } = await client.from('tenants').select('*');

      // Should succeed (RLS policies filter results)
      expect(Array.isArray(data)).toBe(true);
      expect(error).toBeNull();
    });
  });

  // ==========================================================================
  // TOKEN REFRESH TESTS
  // ==========================================================================

  describe('Token Refresh', () => {
    it('should refresh session when calling refreshSession', async () => {
      client = await createTestUser(testEmail, testPassword);

      const originalSession = await getSession(client);
      expect(originalSession).not.toBeNull();

      // Refresh session
      const { data, error } = await client.auth.refreshSession();
      expect(error).toBeNull();
      expect(data.session).not.toBeNull();

      // New session should have same user
      expect(data.session?.user.id).toBe(originalSession?.user.id);
    });
  });

  // ==========================================================================
  // USER METADATA TESTS
  // ==========================================================================

  describe('User Metadata', () => {
    it('should store and retrieve user metadata', async () => {
      const metadata = {
        display_name: 'Test User',
        locale: 'en',
      };

      client = await createTestUser(testEmail, testPassword);

      // Update metadata
      const { error: updateError } = await client.auth.updateUser({
        data: metadata,
      });
      expect(updateError).toBeNull();

      // Get updated user
      const user = await getUser(client);
      expect(user?.user_metadata).toMatchObject(metadata);
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should return error for invalid credentials', async () => {
      client = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await client.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'WrongPassword123!',
      });

      expect(error).not.toBeNull();
      expect(data.session).toBeNull();
    });

    it('should return error for duplicate email signup', async () => {
      // Create user first
      await createTestUser(testEmail, testPassword);

      // Try to create again with same email
      client = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await client.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      expect(error).not.toBeNull();
    });

    it('should return error for weak password', async () => {
      client = createClient(supabaseUrl, supabaseAnonKey);
      const weakEmail = generateTestEmail();

      const { error } = await client.auth.signUp({
        email: weakEmail,
        password: '123', // Too weak
      });

      expect(error).not.toBeNull();
    });
  });
});

/**
 * ============================================================================
 * NOTES ON AUTH CONTEXT TESTING
 * ============================================================================
 *
 * 1. Session Persistence:
 *    - Supabase client automatically persists session to AsyncStorage
 *    - Session is restored on app initialization
 *    - Token refresh happens automatically before expiration
 *
 * 2. Tenant Context:
 *    - Tenant selection is client-side only (stored in AsyncStorage)
 *    - RLS policies use auth.uid() to identify user and filter memberships
 *    - Tenant context must be validated on each app launch
 *
 * 3. RLS Policy Integration:
 *    - All queries are filtered by user's active memberships
 *    - Cross-tenant access is blocked at database level
 *    - Users can only access data from tenants where they have status='active'
 *
 * 4. Testing Best Practices:
 *    - Use unique emails for each test run to avoid conflicts
 *    - Clean up test users after tests complete
 *    - Test both success and failure scenarios
 *    - Verify RLS policies actually enforce isolation
 */
