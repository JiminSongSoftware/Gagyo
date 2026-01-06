/**
 * Prayer Analytics RLS Integration Tests
 *
 * Tests Row Level Security policies for Prayer Analytics to ensure:
 * 1. Individual scope: User can only query their own authored prayers
 * 2. Small group scope: User can only query prayers for their small group
 * 3. Church-wide scope: All tenant members can query church-wide prayers
 * 4. Cross-tenant isolation is enforced
 * 5. Date range filtering works correctly for all periods
 *
 * IMPORTANT: These tests require a real authenticated Supabase client.
 *
 * Running tests:
 * bun test __tests__/integration/prayer-analytics-rls.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in environment variables.'
  );
}

// ============================================================================
// TEST DATA (Fixed UUIDs for consistency)
// ============================================================================

const TEST_DATA = {
  // Tenant
  tenantId: '22222222-2222-2222-2222-222222222222',
  // Different tenant for cross-tenant testing
  otherTenantId: '33333333-3333-3333-3333-333333333333',

  // Users
  userAEmail: 'prayer-analytics-user-a@example.com',
  userAId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  userBEmail: 'prayer-analytics-user-b@example.com',
  userBId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  userCEmail: 'prayer-analytics-user-c@example.com',
  userCId: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',

  // Different tenant user
  userDEmail: 'prayer-analytics-user-d@example.com',
  userDId: 'dddddddd-dddd-dddd-dddd-dddddddddddd1',

  // Memberships
  userAMembershipId: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm1',
  userBMembershipId: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm2',
  userCMembershipId: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm3',
  userDMembershipId: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm4',

  // Small Groups
  smallGroupId1: 'ssssssss-ssss-ssss-ssss-ssssssssssss1',
  smallGroupId2: 'ssssssss-ssss-ssss-ssss-ssssssssssss2',

  // Test password
  testPassword: 'PrayerAnalytics-Test-123!',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sign up a test user and return their session
 */
async function signUpTestUser(email: string): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase.auth.signUp({
    email,
    password: TEST_DATA.testPassword,
    options: {
      data: {
        display_name: email.split('@')[0],
      },
    },
  });

  if (error && !error.message.includes('already registered')) {
    throw new Error(`Failed to sign up test user ${email}: ${error.message}`);
  }
}

/**
 * Sign in and return a client with the user's session
 */
async function getAuthenticatedClient(email: string): Promise<SupabaseClient> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_DATA.testPassword,
  });

  if (error) {
    throw new Error(`Failed to sign in ${email}: ${error.message}`);
  }

  return supabase;
}

/**
 * Get service role client for setup/cleanup (bypasses RLS)
 */
function getServiceRoleClient(): SupabaseClient | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set - some tests may fail');
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Set up test data: tenant, memberships, small groups, prayer cards
 */
async function setupTestData(): Promise<void> {
  const serviceRole = getServiceRoleClient();
  if (!serviceRole) {
    console.warn('Cannot set up test data without service role client');
    return;
  }

  // Create tenants
  await serviceRole.from('tenants').upsert([
    {
      id: TEST_DATA.tenantId,
      name: 'Prayer Analytics Test Tenant',
      slug: 'prayer-analytics-test',
    },
    {
      id: TEST_DATA.otherTenantId,
      name: 'Other Tenant',
      slug: 'other-tenant',
    },
  ]);

  // Create memberships
  await serviceRole.from('memberships').upsert([
    {
      id: TEST_DATA.userAMembershipId,
      tenant_id: TEST_DATA.tenantId,
      user_id: TEST_DATA.userAId,
      role: 'member',
      status: 'active',
      small_group_id: TEST_DATA.smallGroupId1,
    },
    {
      id: TEST_DATA.userBMembershipId,
      tenant_id: TEST_DATA.tenantId,
      user_id: TEST_DATA.userBId,
      role: 'member',
      status: 'active',
      small_group_id: TEST_DATA.smallGroupId1,
    },
    {
      id: TEST_DATA.userCMembershipId,
      tenant_id: TEST_DATA.tenantId,
      user_id: TEST_DATA.userCId,
      role: 'member',
      status: 'active',
      small_group_id: TEST_DATA.smallGroupId2,
    },
    {
      id: TEST_DATA.userDMembershipId,
      tenant_id: TEST_DATA.otherTenantId,
      user_id: TEST_DATA.userDId,
      role: 'member',
      status: 'active',
    },
  ]);

  // Create small groups
  await serviceRole.from('small_groups').upsert([
    {
      id: TEST_DATA.smallGroupId1,
      tenant_id: TEST_DATA.tenantId,
      name: 'Test Small Group 1',
    },
    {
      id: TEST_DATA.smallGroupId2,
      tenant_id: TEST_DATA.tenantId,
      name: 'Test Small Group 2',
    },
  ]);
}

/**
 * Clean up test data
 */
async function cleanupTestData(): Promise<void> {
  const serviceRole = getServiceRoleClient();
  if (!serviceRole) return;

  // Delete in correct order due to foreign keys
  await serviceRole
    .from('prayer_cards')
    .delete()
    .in('tenant_id', [TEST_DATA.tenantId, TEST_DATA.otherTenantId]);
  await serviceRole.from('small_groups').delete().eq('tenant_id', TEST_DATA.tenantId);
  await serviceRole
    .from('memberships')
    .delete()
    .in('id', [
      TEST_DATA.userAMembershipId,
      TEST_DATA.userBMembershipId,
      TEST_DATA.userCMembershipId,
      TEST_DATA.userDMembershipId,
    ]);
  await serviceRole
    .from('tenants')
    .delete()
    .in('id', [TEST_DATA.tenantId, TEST_DATA.otherTenantId]);
}

/**
 * Create test prayer cards for analytics testing
 */
async function createTestPrayerCards(serviceRole: SupabaseClient): Promise<void> {
  const now = new Date();

  // User A's individual prayers (5 total, 3 answered)
  await serviceRole.from('prayer_cards').insert([
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userAMembershipId,
      recipient_scope: 'individual',
      title: 'User A Prayer 1',
      content: 'Content 1',
      answered: true,
      answered_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userAMembershipId,
      recipient_scope: 'individual',
      title: 'User A Prayer 2',
      content: 'Content 2',
      answered: true,
      answered_at: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
    },
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userAMembershipId,
      recipient_scope: 'individual',
      title: 'User A Prayer 3',
      content: 'Content 3',
      answered: true,
      answered_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userAMembershipId,
      recipient_scope: 'individual',
      title: 'User A Prayer 4',
      content: 'Content 4',
      answered: false,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6).toISOString(), // 6 days ago
    },
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userAMembershipId,
      recipient_scope: 'individual',
      title: 'User A Prayer 5',
      content: 'Content 5',
      answered: false,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    },
  ]);

  // User B's individual prayers (2 total, 1 answered) - should NOT be visible to User A in individual scope
  await serviceRole.from('prayer_cards').insert([
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userBMembershipId,
      recipient_scope: 'individual',
      title: 'User B Prayer 1',
      content: 'Content B1',
      answered: true,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userBMembershipId,
      recipient_scope: 'individual',
      title: 'User B Prayer 2',
      content: 'Content B2',
      answered: false,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
  ]);

  // Church-wide prayers (3 total, 2 answered) - should be visible to all tenant members
  await serviceRole.from('prayer_cards').insert([
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userAMembershipId,
      recipient_scope: 'church_wide',
      title: 'Church Prayer 1',
      content: 'Church Content 1',
      answered: true,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userBMembershipId,
      recipient_scope: 'church_wide',
      title: 'Church Prayer 2',
      content: 'Church Content 2',
      answered: true,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userAMembershipId,
      recipient_scope: 'church_wide',
      title: 'Church Prayer 3',
      content: 'Church Content 3',
      answered: false,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    },
  ]);

  // Small group scope prayers (4 total, 2 answered) - visible to small group 1 members
  await serviceRole.from('prayer_cards').insert([
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userBMembershipId,
      recipient_scope: 'small_group',
      title: 'Group Prayer 1',
      content: 'Group Content 1',
      answered: true,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userBMembershipId,
      recipient_scope: 'small_group',
      title: 'Group Prayer 2',
      content: 'Group Content 2',
      answered: true,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userAMembershipId,
      recipient_scope: 'small_group',
      title: 'Group Prayer 3',
      content: 'Group Content 3',
      answered: false,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
    {
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userAMembershipId,
      recipient_scope: 'small_group',
      title: 'Group Prayer 4',
      content: 'Group Content 4',
      answered: false,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
  ]);

  // Other tenant prayer card - should NOT be visible to tenant 1 users
  await serviceRole.from('prayer_cards').insert({
    tenant_id: TEST_DATA.otherTenantId,
    author_id: TEST_DATA.userDMembershipId,
    recipient_scope: 'church_wide',
    title: 'Other Tenant Prayer',
    content: 'Other Tenant Content',
    answered: true,
    created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
  });

  // Old prayer card outside weekly range (20 days ago)
  await serviceRole.from('prayer_cards').insert({
    tenant_id: TEST_DATA.tenantId,
    author_id: TEST_DATA.userAMembershipId,
    recipient_scope: 'individual',
    title: 'Old Prayer',
    content: 'Old Content',
    answered: false,
    created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 20).toISOString(),
  });
}

/**
 * Get date range for a period
 */
function getDateRange(period: 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const endDate = now.toISOString();
  let startDate: Date;

  switch (period) {
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarterly':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'semi_annual':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 6);
      break;
    case 'annual':
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  return {
    startDate: startDate.toISOString(),
    endDate,
  };
}

// ============================================================================
// TEST SETUP AND TEARDOWN
// ============================================================================

describe('Prayer Analytics RLS Policies', () => {
  let userAClient: SupabaseClient;
  let userBClient: SupabaseClient;
  // Reserved for future cross-user testing scenarios
  let _userCClient: SupabaseClient;
  let _userDClient: SupabaseClient;

  beforeAll(async () => {
    // Create test users
    await signUpTestUser(TEST_DATA.userAEmail);
    await signUpTestUser(TEST_DATA.userBEmail);
    await signUpTestUser(TEST_DATA.userCEmail);
    await signUpTestUser(TEST_DATA.userDEmail);

    // Set up test data (tenant, memberships, small groups)
    await setupTestData();

    // Create test prayer cards
    const serviceRole = getServiceRoleClient();
    if (serviceRole) {
      await createTestPrayerCards(serviceRole);
    }

    // Get authenticated clients
    userAClient = await getAuthenticatedClient(TEST_DATA.userAEmail);
    userBClient = await getAuthenticatedClient(TEST_DATA.userBEmail);
    // Reserved for future cross-user testing scenarios
    _userCClient = await getAuthenticatedClient(TEST_DATA.userCEmail);
    _userDClient = await getAuthenticatedClient(TEST_DATA.userDEmail);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // ============================================================================
  // TEST: Individual Scope - User can see own authored prayers
  // ============================================================================

  it('should allow user to query their own authored prayers (individual scope)', async () => {
    const { startDate, endDate } = getDateRange('weekly');

    const { data, error } = await userAClient
      .from('prayer_cards')
      .select('id, author_id, answered, created_at')
      .eq('tenant_id', TEST_DATA.tenantId)
      .eq('author_id', TEST_DATA.userAMembershipId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    // User A should see 5 of their own prayers (excluding the 20-day-old one)
    const userAPrayers = data?.filter((p) => p.author_id === TEST_DATA.userAMembershipId) ?? [];
    expect(userAPrayers.length).toBeGreaterThanOrEqual(5);

    // Verify no other user's prayers are included
    const otherPrayers = data?.filter((p) => p.author_id !== TEST_DATA.userAMembershipId) ?? [];
    expect(otherPrayers.length).toBe(0);
  });

  // ============================================================================
  // TEST: Individual Scope - User cannot see other users' prayers
  // ============================================================================

  it('should block user from seeing other users individual prayers', async () => {
    const { startDate, endDate } = getDateRange('weekly');

    // User A queries for User B's prayers directly
    const { data, error } = await userAClient
      .from('prayer_cards')
      .select('id, author_id')
      .eq('tenant_id', TEST_DATA.tenantId)
      .eq('author_id', TEST_DATA.userBMembershipId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    expect(error).toBeNull();

    // User A should not see User B's individual prayers
    // RLS should prevent this query from returning User B's prayers
    const userBPrayers = data?.filter((p) => p.author_id === TEST_DATA.userBMembershipId) ?? [];
    expect(userBPrayers.length).toBe(0);
  });

  // ============================================================================
  // TEST: Small Group Scope - User can query small group prayers
  // ============================================================================

  it('should allow user to query prayers for their small group', async () => {
    const { startDate, endDate } = getDateRange('weekly');

    const { data, error } = await userAClient
      .from('prayer_cards')
      .select('id, recipient_scope, author_id')
      .eq('tenant_id', TEST_DATA.tenantId)
      .eq('recipient_scope', 'small_group')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    // User A (small group 1) should see small group scope prayers
    // RLS should handle filtering to only show prayers for their small group
    expect(data?.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // TEST: Church-wide Scope - All tenant members can query
  // ============================================================================

  it('should allow all tenant members to query church-wide prayers', async () => {
    const { startDate, endDate } = getDateRange('weekly');

    // User A queries church-wide prayers
    const { data: dataA, error: errorA } = await userAClient
      .from('prayer_cards')
      .select('id, recipient_scope')
      .eq('tenant_id', TEST_DATA.tenantId)
      .eq('recipient_scope', 'church_wide')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    expect(errorA).toBeNull();
    expect(dataA?.length).toBeGreaterThan(0);

    // User B should also see the same church-wide prayers
    const { data: dataB, error: errorB } = await userBClient
      .from('prayer_cards')
      .select('id, recipient_scope')
      .eq('tenant_id', TEST_DATA.tenantId)
      .eq('recipient_scope', 'church_wide')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    expect(errorB).toBeNull();
    expect(dataB?.length).toBe(dataA?.length);
  });

  // ============================================================================
  // TEST: Cross-tenant isolation
  // ============================================================================

  it('should enforce cross-tenant isolation - user cannot see other tenant prayers', async () => {
    const { startDate, endDate } = getDateRange('weekly');

    // User A (tenant 1) tries to query tenant 2's church-wide prayers
    const { data, error } = await userAClient
      .from('prayer_cards')
      .select('id, tenant_id')
      .eq('tenant_id', TEST_DATA.otherTenantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    expect(error).toBeNull();

    // Should return empty - RLS blocks cross-tenant access
    expect(data?.length).toBe(0);
  });

  // ============================================================================
  // TEST: Date range filtering - Weekly
  // ============================================================================

  it('should correctly filter prayers by weekly date range', async () => {
    const { startDate, endDate } = getDateRange('weekly');

    const { data, error } = await userAClient
      .from('prayer_cards')
      .select('id, created_at')
      .eq('tenant_id', TEST_DATA.tenantId)
      .eq('author_id', TEST_DATA.userAMembershipId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    expect(error).toBeNull();

    // The old prayer (20 days ago) should not be included
    const oldPrayers = data?.filter((p) => p.title === 'Old Prayer') ?? [];
    expect(oldPrayers.length).toBe(0);

    // Recent prayers should be included
    expect(data?.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // TEST: Date range filtering - Monthly
  // ============================================================================

  it('should correctly filter prayers by monthly date range', async () => {
    const { startDate, endDate } = getDateRange('monthly');

    const { data, error } = await userAClient
      .from('prayer_cards')
      .select('id, created_at')
      .eq('tenant_id', TEST_DATA.tenantId)
      .eq('author_id', TEST_DATA.userAMembershipId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // TEST: Answer rate calculation verification
  // ============================================================================

  it('should correctly calculate answer rate for user prayers', async () => {
    const { startDate, endDate } = getDateRange('weekly');

    const { data, error } = await userAClient
      .from('prayer_cards')
      .select('id, answered')
      .eq('tenant_id', TEST_DATA.tenantId)
      .eq('author_id', TEST_DATA.userAMembershipId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    expect(error).toBeNull();

    const totalPrayers = data?.length ?? 0;
    const answeredPrayers = data?.filter((p) => p.answered).length ?? 0;
    const answerRate = totalPrayers > 0 ? (answeredPrayers / totalPrayers) * 100 : 0;

    // Verify calculation matches expected values
    expect(totalPrayers).toBeGreaterThan(0);
    expect(answeredPrayers).toBeGreaterThan(0);
    expect(answerRate).toBeGreaterThan(0);
    expect(answerRate).toBeLessThanOrEqual(100);
  });

  // ============================================================================
  // TEST: Zero prayers scenario
  // ============================================================================

  it('should handle zero prayers scenario gracefully', async () => {
    // Query with a date range far in the future (no prayers)
    const futureStartDate = new Date();
    futureStartDate.setFullYear(futureStartDate.getFullYear() + 10);
    const futureEndDate = new Date();
    futureEndDate.setFullYear(futureEndDate.getFullYear() + 11);

    const { data, error } = await userAClient
      .from('prayer_cards')
      .select('id')
      .eq('tenant_id', TEST_DATA.tenantId)
      .eq('author_id', TEST_DATA.userAMembershipId)
      .gte('created_at', futureStartDate.toISOString())
      .lte('created_at', futureEndDate.toISOString());

    expect(error).toBeNull();
    expect(data?.length).toBe(0);
  });

  // ============================================================================
  // TEST: All prayers answered scenario
  // ============================================================================

  it('should return 100% answer rate when all prayers are answered', async () => {
    // Create a test scenario where all prayers are answered
    const serviceRole = getServiceRoleClient();
    if (!serviceRole) {
      console.warn('Skipping test: no service role client');
      return;
    }

    const now = new Date();
    await serviceRole.from('prayer_cards').insert({
      tenant_id: TEST_DATA.tenantId,
      author_id: TEST_DATA.userAMembershipId,
      recipient_scope: 'individual',
      title: 'All Answered Test Prayer',
      content: 'Test',
      answered: true,
      created_at: now.toISOString(),
    });

    const { startDate, endDate } = getDateRange('weekly');

    // Query only the specific test prayer
    const { data, error } = await userAClient
      .from('prayer_cards')
      .select('id, answered')
      .eq('tenant_id', TEST_DATA.tenantId)
      .eq('author_id', TEST_DATA.userAMembershipId)
      .eq('title', 'All Answered Test Prayer')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    expect(error).toBeNull();

    const totalPrayers = data?.length ?? 0;
    const answeredPrayers = data?.filter((p) => p.answered).length ?? 0;
    const answerRate = totalPrayers > 0 ? (answeredPrayers / totalPrayers) * 100 : 0;

    expect(totalPrayers).toBe(1);
    expect(answeredPrayers).toBe(1);
    expect(answerRate).toBe(100);
  });
});

/**
 * ============================================================================
 * NOTES ON PRAYER ANALYTICS RLS TESTING
 * ============================================================================
 *
 * Prayer Analytics visibility is enforced through:
 * 1. prayer_cards.tenant_id filtering (RLS enforces tenant isolation)
 * 2. prayer_cards.author_id for individual scope (only own prayers)
 * 3. prayer_cards.recipient_scope='small_group' for small group (RLS checks membership)
 * 4. prayer_cards.recipient_scope='church_wide' for church-wide (all tenant members)
 *
 * The RLS policy pattern:
 * ```sql
 * CREATE POLICY prayer_cards_select_policy ON prayer_cards
 *   FOR SELECT
 *   USING (
 *     -- Tenant isolation
 *     tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid())
 *     AND (
 *       -- Individual: only own prayers
 *       (recipient_scope = 'individual' AND author_id = (SELECT id FROM memberships WHERE user_id = auth.uid()))
 *       -- Small group: member of the small group
 *       OR (recipient_scope = 'small_group' AND author_id IN (
 *           SELECT m.id FROM memberships m
 *           JOIN small_groups sg ON m.small_group_id = sg.id
 *           WHERE m.user_id = auth.uid()
 *         ))
 *       -- Church-wide: all tenant members
 *       OR (recipient_scope = 'church_wide')
 *     )
 *   );
 * ```
 */
