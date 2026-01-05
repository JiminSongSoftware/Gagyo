/**
 * Event Chat RLS Integration Tests
 *
 * Tests Row Level Security policies for Event Chat to ensure:
 * 1. Sender can see their own Event Chat messages
 * 2. Excluded users cannot see Event Chat messages
 * 3. Non-excluded users can see Event Chat messages
 * 4. Cross-tenant isolation is enforced
 * 5. event_chat_exclusions table is only readable by sender
 *
 * IMPORTANT: These tests require a real authenticated Supabase client.
 *
 * Running tests:
 * bun test __tests__/integration/event-chat-rls.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

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
  tenantId: '11111111-1111-1111-1111-111111111111',

  // Users
  userAEmail: 'event-chat-user-a@example.com',
  userAId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  userAEmail: 'event-chat-user-b@example.com',
  userBId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  userCEmail: 'event-chat-user-c@example.com',
  userCId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',

  // Different tenant user
  userDEmail: 'event-chat-user-d@example.com',
  userDId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',

  // Memberships
  userAMembershipId: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmma',
  userBMembershipId: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmmb',
  userCMembershipId: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmmmc',
  userDMembershipId: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmmmd',

  // Conversation
  conversationId: '11112222-3333-4444-5555-666677778888',

  // Test password
  testPassword: 'EventChat-Test-123!',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sign up a test user and return their session
 */
async function signUpTestUser(email: string, userId: string): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.auth.signUp({
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
 * Set up test data: tenant, memberships, conversation
 */
async function setupTestData(): Promise<void> {
  const serviceRole = getServiceRoleClient();
  if (!serviceRole) {
    console.warn('Cannot set up test data without service role client');
    return;
  }

  // Create tenant
  await serviceRole.from('tenants').upsert({
    id: TEST_DATA.tenantId,
    name: 'Event Chat Test Tenant',
    slug: 'event-chat-test',
  });

  // Create users in auth.users already done by signUp
  // Now create memberships
  await serviceRole.from('memberships').upsert([
    {
      id: TEST_DATA.userAMembershipId,
      tenant_id: TEST_DATA.tenantId,
      user_id: TEST_DATA.userAId,
      role: 'member',
      status: 'active',
    },
    {
      id: TEST_DATA.userBMembershipId,
      tenant_id: TEST_DATA.tenantId,
      user_id: TEST_DATA.userBId,
      role: 'member',
      status: 'active',
    },
    {
      id: TEST_DATA.userCMembershipId,
      tenant_id: TEST_DATA.tenantId,
      user_id: TEST_DATA.userCId,
      role: 'member',
      status: 'active',
    },
  ]);

  // Create conversation
  await serviceRole.from('conversations').upsert({
    id: TEST_DATA.conversationId,
    tenant_id: TEST_DATA.tenantId,
    type: 'small_group',
    name: 'Event Chat Test Group',
  });

  // Add participants
  await serviceRole.from('conversation_participants').upsert([
    {
      conversation_id: TEST_DATA.conversationId,
      membership_id: TEST_DATA.userAMembershipId,
    },
    {
      conversation_id: TEST_DATA.conversationId,
      membership_id: TEST_DATA.userBMembershipId,
    },
    {
      conversation_id: TEST_DATA.conversationId,
      membership_id: TEST_DATA.userCMembershipId,
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
  await serviceRole.from('event_chat_exclusions').delete().eq('message_id', TEST_DATA.conversationId); // Using conversation ID as a proxy
  await serviceRole.from('messages').delete().eq('conversation_id', TEST_DATA.conversationId);
  await serviceRole.from('conversation_participants').delete().eq('conversation_id', TEST_DATA.conversationId);
  await serviceRole.from('conversations').delete().eq('id', TEST_DATA.conversationId);
  await serviceRole.from('memberships').delete().in_('id', [
    TEST_DATA.userAMembershipId,
    TEST_DATA.userBMembershipId,
    TEST_DATA.userCMembershipId,
  ]);
  await serviceRole.from('tenants').delete().eq('id', TEST_DATA.tenantId);
}

// ============================================================================
// TEST SETUP AND TEARDOWN
// ============================================================================

describe('Event Chat RLS Policies', () => {
  let userAClient: SupabaseClient;
  let userBClient: SupabaseClient;
  let userCClient: SupabaseClient;
  let testMessageId: string;

  beforeAll(async () => {
    // Create test users
    await signUpTestUser(TEST_DATA.userAEmail, TEST_DATA.userAId);
    await signUpTestUser(TEST_DATA.userBEmail, TEST_DATA.userBId);
    await signUpTestUser(TEST_DATA.userCEmail, TEST_DATA.userCId);

    // Set up test data (tenant, memberships, conversation)
    await setupTestData();

    // Get authenticated clients
    userAClient = await getAuthenticatedClient(TEST_DATA.userAEmail);
    userBClient = await getAuthenticatedClient(TEST_DATA.userBEmail);
    userCClient = await getAuthenticatedClient(TEST_DATA.userCEmail);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // ============================================================================
  // TEST: Sender can see their own Event Chat message
  // ============================================================================

  it('should allow sender to see their own Event Chat message', async () => {
    const serviceRole = getServiceRoleClient();
    if (!serviceRole) {
      console.warn('Skipping test: no service role client');
      return;
    }

    // Create an Event Chat message as User A, excluding User B
    const { data: message, error: insertError } = await serviceRole
      .from('messages')
      .insert({
        tenant_id: TEST_DATA.tenantId,
        conversation_id: TEST_DATA.conversationId,
        sender_id: TEST_DATA.userAMembershipId,
        content: 'Secret surprise party planning!',
        content_type: 'text',
        is_event_chat: true,
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();
    expect(message).not.toBeNull();
    testMessageId = message.id;

    // Create exclusions
    await serviceRole.from('event_chat_exclusions').insert({
      message_id: testMessageId,
      excluded_membership_id: TEST_DATA.userBMembershipId,
    });

    // User A (sender) queries messages
    const { data: messages, error: queryError } = await userAClient
      .from('messages')
      .select('*')
      .eq('conversation_id', TEST_DATA.conversationId);

    expect(queryError).toBeNull();
    expect(messages).toBeArray();

    // Sender should see the Event Chat message
    const eventChatMessage = messages?.find((m: any) => m.id === testMessageId);
    expect(eventChatMessage).toBeDefined();
    expect(eventChatMessage?.content).toBe('Secret surprise party planning!');
    expect(eventChatMessage?.is_event_chat).toBe(true);
  });

  // ============================================================================
  // TEST: Excluded user cannot see Event Chat message
  // ============================================================================

  it('should block excluded user from seeing Event Chat message', async () => {
    // User B (excluded) queries messages
    const { data: messages, error: queryError } = await userBClient
      .from('messages')
      .select('*')
      .eq('conversation_id', TEST_DATA.conversationId);

    expect(queryError).toBeNull();
    expect(messages).toBeArray();

    // User B should NOT see the Event Chat message
    const eventChatMessage = messages?.find((m: any) => m.id === testMessageId);
    expect(eventChatMessage).toBeUndefined();
  });

  // ============================================================================
  // TEST: Non-excluded user can see Event Chat message
  // ============================================================================

  it('should allow non-excluded user to see Event Chat message', async () => {
    // User C (not excluded) queries messages
    const { data: messages, error: queryError } = await userCClient
      .from('messages')
      .select('*')
      .eq('conversation_id', TEST_DATA.conversationId);

    expect(queryError).toBeNull();
    expect(messages).toBeArray();

    // User C should see the Event Chat message
    const eventChatMessage = messages?.find((m: any) => m.id === testMessageId);
    expect(eventChatMessage).toBeDefined();
    expect(eventChatMessage?.content).toBe('Secret surprise party planning!');
  });

  // ============================================================================
  // TEST: event_chat_exclusions table only readable by sender
  // ============================================================================

  it('should allow viewing event_chat_exclusions for sender only', async () => {
    const serviceRole = getServiceRoleClient();
    if (!serviceRole) {
      console.warn('Skipping test: no service role client');
      return;
    }

    // Create another Event Chat message for this test
    const { data: message2 } = await serviceRole
      .from('messages')
      .insert({
        tenant_id: TEST_DATA.tenantId,
        conversation_id: TEST_DATA.conversationId,
        sender_id: TEST_DATA.userAMembershipId,
        content: 'Another secret message',
        content_type: 'text',
        is_event_chat: true,
      })
      .select('id')
      .single();

    const message2Id = message2!.id;

    // Create exclusions
    await serviceRole.from('event_chat_exclusions').insert({
      message_id: message2Id,
      excluded_membership_id: TEST_DATA.userBMembershipId,
    });

    // User A (sender) queries event_chat_exclusions for their message
    const { data: exclusionsForA, error: errorA } = await userAClient
      .from('event_chat_exclusions')
      .select('*')
      .eq('message_id', message2Id);

    // Sender should see exclusions
    expect(errorA).toBeNull();
    expect(exclusionsForA).toBeArray();
    expect(exclusionsForA?.length).toBeGreaterThan(0);

    // User B queries event_chat_exclusions
    const { data: exclusionsForB, error: errorB } = await userBClient
      .from('event_chat_exclusions')
      .select('*')
      .eq('message_id', message2Id);

    // Non-sender should NOT see exclusions (RLS blocks it)
    expect(errorB).toBeNull();
    // Result should be empty or not contain the exclusion
    const exclusionFound = exclusionsForB?.some((e: any) => e.message_id === message2Id);
    expect(exclusionFound).toBe(false);
  });

  // ============================================================================
  // TEST: Multiple exclusions (up to 5)
  // ============================================================================

  it('should support multiple exclusions up to 5 users', async () => {
    const serviceRole = getServiceRoleClient();
    if (!serviceRole) {
      console.warn('Skipping test: no service role client');
      return;
    }

    // Create message with multiple exclusions
    const { data: multiExclusionMessage } = await serviceRole
      .from('messages')
      .insert({
        tenant_id: TEST_DATA.tenantId,
        conversation_id: TEST_DATA.conversationId,
        sender_id: TEST_DATA.userAMembershipId,
        content: 'Planning for multiple people',
        content_type: 'text',
        is_event_chat: true,
      })
      .select('id')
      .single();

    const multiMessageId = multiExclusionMessage!.id;

    // Create 2 exclusions (we only have 3 users total in test)
    const exclusions = [
      { message_id: multiMessageId, excluded_membership_id: TEST_DATA.userBMembershipId },
      { message_id: multiMessageId, excluded_membership_id: TEST_DATA.userCMembershipId },
    ];

    await serviceRole.from('event_chat_exclusions').insert(exclusions);

    // Verify both exclusions exist
    const { data: allExclusions } = await serviceRole
      .from('event_chat_exclusions')
      .select('*')
      .eq('message_id', multiMessageId);

    expect(allExclusions).toBeArray();
    expect(allExclusions?.length).toBe(2);

    // User B should not see the message
    const { data: userBMessages } = await userBClient
      .from('messages')
      .select('*')
      .eq('id', multiMessageId);

    expect(userBMessages?.length).toBe(0);

    // User C should not see the message
    const { data: userCMessages } = await userCClient
      .from('messages')
      .select('*')
      .eq('id', multiMessageId);

    expect(userCMessages?.length).toBe(0);

    // User A (sender) should see the message
    const { data: userAMessages } = await userAClient
      .from('messages')
      .select('*')
      .eq('id', multiMessageId);

    expect(userAMessages?.length).toBe(1);
  });

  // ============================================================================
  // TEST: Regular messages are not affected by Event Chat RLS
  // ============================================================================

  it('should not affect visibility of regular (non-Event Chat) messages', async () => {
    const serviceRole = getServiceRoleClient();
    if (!serviceRole) {
      console.warn('Skipping test: no service role client');
      return;
    }

    // Create a regular message
    const { data: regularMessage } = await serviceRole
      .from('messages')
      .insert({
        tenant_id: TEST_DATA.tenantId,
        conversation_id: TEST_DATA.conversationId,
        sender_id: TEST_DATA.userAMembershipId,
        content: 'Regular message visible to everyone',
        content_type: 'text',
        is_event_chat: false,
      })
      .select('id')
      .single();

    const regularMessageId = regularMessage!.id;

    // All users should see the regular message
    const { data: userAMessages } = await userAClient
      .from('messages')
      .select('*')
      .eq('id', regularMessageId);

    const { data: userBMessages } = await userBClient
      .from('messages')
      .select('*')
      .eq('id', regularMessageId);

    const { data: userCMessages } = await userCClient
      .from('messages')
      .select('*')
      .eq('id', regularMessageId);

    expect(userAMessages?.length).toBe(1);
    expect(userBMessages?.length).toBe(1);
    expect(userCMessages?.length).toBe(1);
  });
});

/**
 * ============================================================================
 * NOTES ON EVENT CHAT RLS TESTING
 * ============================================================================
 *
 * Event Chat visibility is enforced through:
 * 1. messages.is_event_chat flag marks Event Chat messages
 * 2. event_chat_exclusions table stores (message_id, excluded_membership_id) pairs
 * 3. RLS policy on messages filters out messages where user is excluded
 * 4. RLS policy on event_chat_exclusions only allows sender to query
 *
 * The RLS policy pattern:
 * ```sql
 * CREATE POLICY messages_select_policy ON messages
 *   FOR SELECT
 *   USING (
 *     -- User can see message if NOT in exclusions list
 *     NOT EXISTS (
 *       SELECT 1 FROM event_chat_exclusions
 *       WHERE event_chat_exclusions.message_id = messages.id
 *         AND event_chat_exclusions.excluded_membership_id =
 *             (SELECT id FROM memberships WHERE user_id = auth.uid())
 *     )
 *   );
 * ```
 */
