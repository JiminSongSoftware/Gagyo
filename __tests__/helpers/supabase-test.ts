/**
 * Supabase Test Helper
 *
 * Provides utilities for integration testing with Supabase RLS policies.
 * Uses a Postgres connection to simulate auth.uid() via SET LOCAL.
 */

import { Client } from 'pg';

// Test credentials (matches seed data)
export const TEST_DATA = {
  // Tenants
  tenant1Id: '11111111-1111-1111-1111-111111111111',
  tenant2Id: '22222222-2222-2222-2222-222222222222',

  // Users (auth.users IDs)
  user1Id: '22222222-2222-2222-2222-222222222001', // Admin in tenant1
  user2Id: '22222222-2222-2222-2222-222222222002', // Pastor in tenant1
  user3Id: '22222222-2222-2222-2222-222222222003', // Zone Leader in tenant1
  user4Id: '22222222-2222-2222-2222-222222222004', // Small Group Leader in tenant1
  user5Id: '22222222-2222-2222-2222-222222222005', // Regular Member in tenant1
  user6Id: '22222222-2222-2222-2222-222222222006', // Member in tenant2

  // Memberships
  membership1Id: '33333333-3333-3333-3333-333333333001', // Admin
  membership2Id: '33333333-3333-3333-3333-333333333002', // Pastor
  membership3Id: '33333333-3333-3333-3333-333333333003', // Zone Leader
  membership4Id: '33333333-3333-3333-3333-333333333004', // Small Group Leader
  membership5Id: '33333333-3333-3333-3333-333333333005', // Regular Member
  membership6Id: '33333333-3333-3333-3333-333333333006', // Tenant2 Member

  // Small Groups
  group1Id: '55555555-5555-5555-5555-555555555501',
  group2Id: '55555555-5555-5555-5555-555555555502',

  // Zones
  zone1Id: '44444444-4444-4444-4444-444444444001',
  zone2Id: '44444444-4444-4444-4444-444444444002',

  // Conversations
  conversation1Id: '77777777-7777-7777-7777-777777777701', // tenant1 church_wide
  conversation2Id: '77777777-7777-7777-7777-777777777702', // tenant1 small_group
  conversation3Id: '77777777-7777-7777-7777-777777777703', // tenant2

  // Messages
  message1Id: '88888888-8888-8888-8888-888888888801',
  eventMessageId: '88888888-8888-8888-8888-888888888802',

  // Prayer Cards
  prayerCard1Id: '99999999-9999-9999-9999-999999999901', // church_wide
  prayerCard2Id: '99999999-9999-9999-9999-999999999902', // individual
  prayerCard3Id: '99999999-9999-9999-9999-999999999903', // small_group

  // Pastoral Journals
  journal1Id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
  journal2Id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02',

  // Device Tokens
  deviceToken1Id: '22222222-2222-2222-2222-222222222201',
  deviceToken2Id: '22222222-2222-2222-2222-222222222202',
} as const;

/**
 * Execute SQL as a specific user by setting auth.uid() via JWT claims simulation
 * Uses SET LOCAL to set request.jwt.claims which RLS policies use via auth.uid()
 */
type SqlResult<Row extends Record<string, unknown> = Record<string, unknown>> = {
  rows: Row[];
  rowCount: number;
};

export async function executeAsUser<Row extends Record<string, unknown> = Record<string, unknown>>(
  userId: string,
  sql: string,
  connectionString: string
): Promise<SqlResult<Row>> {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    // Start a transaction for auth context isolation
    await client.query('BEGIN');

    // Simulate auth.uid() by setting JWT claims
    // This works with Supabase's auth.uid() function which reads from JWT
    await client.query(`SET LOCAL request.jwt.claims = jsonb_build_object(
      'sub', '${userId}',
      'user_id', '${userId}',
      'role', 'authenticated',
      'aud', 'authenticated'
    )`);

    // Execute the actual query
    const result = await client.query(sql);

    // Rollback to keep test isolated
    await client.query('ROLLBACK');

    return { rows: result.rows as Row[], rowCount: result.rowCount || 0 };
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    throw new Error('Query execution failed');
  } finally {
    await client.end();
  }
}

/**
 * Execute SQL with service_role (bypasses RLS for setup/teardown)
 */
export async function executeAsServiceRole<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(sql: string, connectionString: string): Promise<SqlResult<Row>> {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    const result = await client.query(sql);
    return { rows: result.rows as Row[], rowCount: result.rowCount || 0 };
  } finally {
    await client.end();
  }
}

/**
 * Create auth.users entry for testing (requires service_role)
 * Note: auth.users table is managed by Supabase Auth
 */
export async function createTestAuthUser(
  userId: string,
  email: string,
  connectionString: string
): Promise<void> {
  const sql = `
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    VALUES (
      '${userId}',
      '${email}',
      crypt('password', gen_salt('bf')),
      NOW(),
      '{"full_name": "${email.split('@')[0]}"}',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  `;
  await executeAsServiceRole(sql, connectionString);
}

/**
 * Setup complete test data including auth.users, tenants, users, memberships
 */
export async function setupCompleteTestData(connectionString: string): Promise<void> {
  console.log('Setting up test data...');

  // Create auth.users entries
  await createTestAuthUser(TEST_DATA.user1Id, 'admin@test.com', connectionString);
  await createTestAuthUser(TEST_DATA.user2Id, 'pastor@test.com', connectionString);
  await createTestAuthUser(TEST_DATA.user3Id, 'zoneleader@test.com', connectionString);
  await createTestAuthUser(TEST_DATA.user4Id, 'sgleader@test.com', connectionString);
  await createTestAuthUser(TEST_DATA.user5Id, 'member@test.com', connectionString);
  await createTestAuthUser(TEST_DATA.user6Id, 'tenant2member@test.com', connectionString);

  // Create tenants
  const tenantSql = `
    INSERT INTO tenants (id, name, slug, settings)
    VALUES
      ('${TEST_DATA.tenant1Id}', 'Test Church 1', 'test-church-1', '{"timezone": "America/New_York"}'),
      ('${TEST_DATA.tenant2Id}', 'Test Church 2', 'test-church-2', '{"timezone": "America/Los_Angeles"}')
    ON CONFLICT (id) DO NOTHING;
  `;
  await executeAsServiceRole(tenantSql, connectionString);

  // Create users
  const usersSql = `
    INSERT INTO users (id, display_name, locale)
    VALUES
      ('${TEST_DATA.user1Id}', 'Admin User', 'en'),
      ('${TEST_DATA.user2Id}', 'Pastor User', 'en'),
      ('${TEST_DATA.user3Id}', 'Zone Leader User', 'en'),
      ('${TEST_DATA.user4Id}', 'Small Group Leader User', 'en'),
      ('${TEST_DATA.user5Id}', 'Regular Member', 'en'),
      ('${TEST_DATA.user6Id}', 'Tenant2 Member', 'en')
    ON CONFLICT (id) DO NOTHING;
  `;
  await executeAsServiceRole(usersSql, connectionString);

  // Create memberships
  const membershipsSql = `
    INSERT INTO memberships (id, user_id, tenant_id, role, status, small_group_id)
    VALUES
      ('${TEST_DATA.membership1Id}', '${TEST_DATA.user1Id}', '${TEST_DATA.tenant1Id}', 'admin', 'active', NULL),
      ('${TEST_DATA.membership2Id}', '${TEST_DATA.user2Id}', '${TEST_DATA.tenant1Id}', 'pastor', 'active', NULL),
      ('${TEST_DATA.membership3Id}', '${TEST_DATA.user3Id}', '${TEST_DATA.tenant1Id}', 'zone_leader', 'active', NULL),
      ('${TEST_DATA.membership4Id}', '${TEST_DATA.user4Id}', '${TEST_DATA.tenant1Id}', 'small_group_leader', 'active', '${TEST_DATA.group1Id}'),
      ('${TEST_DATA.membership5Id}', '${TEST_DATA.user5Id}', '${TEST_DATA.tenant1Id}', 'member', 'active', '${TEST_DATA.group1Id}'),
      ('${TEST_DATA.membership6Id}', '${TEST_DATA.user6Id}', '${TEST_DATA.tenant2Id}', 'member', 'active', NULL)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  `;
  await executeAsServiceRole(membershipsSql, connectionString);

  // Create zones
  const zonesSql = `
    INSERT INTO zones (id, tenant_id, name, zone_leader_id)
    VALUES
      ('${TEST_DATA.zone1Id}', '${TEST_DATA.tenant1Id}', 'Zone A', '${TEST_DATA.membership3Id}'),
      ('${TEST_DATA.zone2Id}', '${TEST_DATA.tenant1Id}', 'Zone B', '${TEST_DATA.membership3Id}')
    ON CONFLICT (tenant_id, name) DO NOTHING;
  `;
  await executeAsServiceRole(zonesSql, connectionString);

  // Update small groups with zone references
  const updateGroupsSql = `
    INSERT INTO small_groups (id, tenant_id, zone_id, name, leader_id, co_leader_id)
    VALUES
      ('${TEST_DATA.group1Id}', '${TEST_DATA.tenant1Id}', '${TEST_DATA.zone1Id}', 'Alpha Group', '${TEST_DATA.membership4Id}', NULL),
      ('${TEST_DATA.group2Id}', '${TEST_DATA.tenant1Id}', '${TEST_DATA.zone1Id}', 'Beta Group', '${TEST_DATA.membership4Id}', NULL)
    ON CONFLICT (tenant_id, name) DO NOTHING;

    -- Update zone leader reference
    UPDATE zones SET zone_leader_id = '${TEST_DATA.membership3Id}' WHERE id = '${TEST_DATA.zone1Id}';
  `;
  await executeAsServiceRole(updateGroupsSql, connectionString);

  // Create conversations
  const conversationsSql = `
    INSERT INTO conversations (id, tenant_id, type, name, small_group_id)
    VALUES
      ('${TEST_DATA.conversation1Id}', '${TEST_DATA.tenant1Id}', 'church_wide', 'General Announcements', NULL),
      ('${TEST_DATA.conversation2Id}', '${TEST_DATA.tenant1Id}', 'small_group', 'Alpha Group Chat', '${TEST_DATA.group1Id}'),
      ('${TEST_DATA.conversation3Id}', '${TEST_DATA.tenant2Id}', 'church_wide', 'Tenant2 Announcements', NULL)
    ON CONFLICT DO NOTHING;
  `;
  await executeAsServiceRole(conversationsSql, connectionString);

  // Create messages
  const messagesSql = `
    INSERT INTO messages (id, tenant_id, conversation_id, sender_id, content, content_type, is_event_chat)
    VALUES
      ('${TEST_DATA.message1Id}', '${TEST_DATA.tenant1Id}', '${TEST_DATA.conversation1Id}', '${TEST_DATA.membership1Id}', 'Welcome to Test Church 1!', 'text', false),
      ('${TEST_DATA.eventMessageId}', '${TEST_DATA.tenant1Id}', '${TEST_DATA.conversation2Id}', '${TEST_DATA.membership4Id}', 'Event message', 'text', true)
    ON CONFLICT DO NOTHING;
  `;
  await executeAsServiceRole(messagesSql, connectionString);

  // Create prayer cards
  const prayerCardsSql = `
    INSERT INTO prayer_cards (id, tenant_id, author_id, content, recipient_scope)
    VALUES
      ('${TEST_DATA.prayerCard1Id}', '${TEST_DATA.tenant1Id}', '${TEST_DATA.membership5Id}', 'Please pray for my job interview tomorrow.', 'church_wide'),
      ('${TEST_DATA.prayerCard2Id}', '${TEST_DATA.tenant1Id}', '${TEST_DATA.membership5Id}', 'Prayer request for my family.', 'individual'),
      ('${TEST_DATA.prayerCard3Id}', '${TEST_DATA.tenant1Id}', '${TEST_DATA.membership4Id}', 'Pray for our small group outreach event.', 'small_group')
    ON CONFLICT DO NOTHING;

    -- Add prayer card recipients
    INSERT INTO prayer_card_recipients (prayer_card_id, recipient_membership_id)
    VALUES ('${TEST_DATA.prayerCard2Id}', '${TEST_DATA.membership1Id}')
    ON CONFLICT DO NOTHING;

    INSERT INTO prayer_card_recipients (prayer_card_id, recipient_small_group_id)
    VALUES ('${TEST_DATA.prayerCard3Id}', '${TEST_DATA.group1Id}')
    ON CONFLICT DO NOTHING;
  `;
  await executeAsServiceRole(prayerCardsSql, connectionString);

  // Create pastoral journals
  const journalsSql = `
    INSERT INTO pastoral_journals (id, tenant_id, small_group_id, author_id, week_start_date, content, status)
    VALUES
      ('${TEST_DATA.journal1Id}', '${TEST_DATA.tenant1Id}', '${TEST_DATA.group1Id}', '${TEST_DATA.membership4Id}', '2024-01-01', 'This week we had 8 attendees.', 'draft'),
      ('${TEST_DATA.journal2Id}', '${TEST_DATA.tenant1Id}', '${TEST_DATA.group2Id}', '${TEST_DATA.membership4Id}', '2024-01-08', 'Beta group meeting went well.', 'submitted')
    ON CONFLICT (small_group_id, week_start_date) DO NOTHING;
  `;
  await executeAsServiceRole(journalsSql, connectionString);

  // Create device tokens
  const deviceTokensSql = `
    INSERT INTO device_tokens (id, tenant_id, user_id, token, platform)
    VALUES
      ('${TEST_DATA.deviceToken1Id}', '${TEST_DATA.tenant1Id}', '${TEST_DATA.user1Id}', 'token_user1_ios', 'ios'),
      ('${TEST_DATA.deviceToken2Id}', '${TEST_DATA.tenant1Id}', '${TEST_DATA.user5Id}', 'token_user5_android', 'android')
    ON CONFLICT (tenant_id, token) DO NOTHING;
  `;
  await executeAsServiceRole(deviceTokensSql, connectionString);

  console.log('Test data setup complete!');
}

/**
 * Clean up all test data
 */
export async function cleanupTestData(connectionString: string): Promise<void> {
  console.log('Cleaning up test data...');

  const cleanupSql = `
    -- Delete in reverse order of dependencies
    DELETE FROM device_tokens WHERE tenant_id IN ('${TEST_DATA.tenant1Id}', '${TEST_DATA.tenant2Id}');
    DELETE FROM pastoral_journal_comments WHERE pastoral_journal_id IN ('${TEST_DATA.journal1Id}', '${TEST_DATA.journal2Id}');
    DELETE FROM pastoral_journals WHERE id IN ('${TEST_DATA.journal1Id}', '${TEST_DATA.journal2Id}');
    DELETE FROM prayer_card_recipients WHERE prayer_card_id IN ('${TEST_DATA.prayerCard1Id}', '${TEST_DATA.prayerCard2Id}', '${TEST_DATA.prayerCard3Id}');
    DELETE FROM prayer_cards WHERE id IN ('${TEST_DATA.prayerCard1Id}', '${TEST_DATA.prayerCard2Id}', '${TEST_DATA.prayerCard3Id}');
    DELETE FROM messages WHERE id IN ('${TEST_DATA.message1Id}', '${TEST_DATA.eventMessageId}');
    DELETE FROM conversation_participants WHERE conversation_id IN ('${TEST_DATA.conversation1Id}', '${TEST_DATA.conversation2Id}', '${TEST_DATA.conversation3Id}');
    DELETE FROM conversations WHERE id IN ('${TEST_DATA.conversation1Id}', '${TEST_DATA.conversation2Id}', '${TEST_DATA.conversation3Id}');
    DELETE FROM small_groups WHERE id IN ('${TEST_DATA.group1Id}', '${TEST_DATA.group2Id}');
    DELETE FROM zones WHERE id IN ('${TEST_DATA.zone1Id}', '${TEST_DATA.zone2Id}');
    DELETE FROM memberships WHERE id IN ('${TEST_DATA.membership1Id}', '${TEST_DATA.membership2Id}', '${TEST_DATA.membership3Id}', '${TEST_DATA.membership4Id}', '${TEST_DATA.membership5Id}', '${TEST_DATA.membership6Id}');
    DELETE FROM users WHERE id IN ('${TEST_DATA.user1Id}', '${TEST_DATA.user2Id}', '${TEST_DATA.user3Id}', '${TEST_DATA.user4Id}', '${TEST_DATA.user5Id}', '${TEST_DATA.user6Id}');
    DELETE FROM tenants WHERE id IN ('${TEST_DATA.tenant1Id}', '${TEST_DATA.tenant2Id}');
    DELETE FROM auth.users WHERE id IN ('${TEST_DATA.user1Id}', '${TEST_DATA.user2Id}', '${TEST_DATA.user3Id}', '${TEST_DATA.user4Id}', '${TEST_DATA.user5Id}', '${TEST_DATA.user6Id}');
  `;

  await executeAsServiceRole(cleanupSql, connectionString);
  console.log('Test data cleanup complete!');
}
