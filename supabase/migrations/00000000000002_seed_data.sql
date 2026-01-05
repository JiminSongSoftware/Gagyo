-- ============================================================================
-- Gagyo Backend Schema - Seed Data Migration
-- ============================================================================
-- This migration creates minimal seed data for development and testing.
--
-- IMPORTANT: This seed data requires Supabase Auth users to be created first.
-- Auth users must be created via:
-- - Supabase Dashboard: Authentication → Users → Add user
-- - Supabase CLI: supabase auth user create
-- - Auth API in your application
--
-- After creating auth.users entries with the IDs below, run this migration.
--
-- See: claude_docs/04_multi_tenant_model.md for complete schema documentation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Test Tenant
-- ----------------------------------------------------------------------------

INSERT INTO tenants (id, name, slug, settings) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Church', 'test-church', '{"timezone": "America/New_York"}'::jsonb);

-- ----------------------------------------------------------------------------
-- Test Users
-- ----------------------------------------------------------------------------
-- NOTE: These users must be created in Supabase Auth first!
-- Create auth.users entries with these exact IDs before running this migration.

-- User IDs (must match auth.users.id)
-- - admin_user_id: 22222222-2222-2222-2222-222222222001 (Admin)
-- - pastor_user_id: 22222222-2222-2222-2222-222222222002 (Pastor)
-- - zone_leader_user_id: 22222222-2222-2222-2222-222222222003 (Zone Leader)
-- - small_group_leader_user_id: 22222222-2222-2222-2222-222222222004 (Small Group Leader)
-- - member_user_id: 22222222-2222-2222-2222-222222222005 (Regular Member)

INSERT INTO users (id, display_name, locale) VALUES
  ('22222222-2222-2222-2222-222222222001', 'Admin User', 'en'),
  ('22222222-2222-2222-2222-222222222002', 'Pastor User', 'en'),
  ('22222222-2222-2222-2222-222222222003', 'Zone Leader User', 'en'),
  ('22222222-2222-2222-2222-222222222004', 'Small Group Leader User', 'en'),
  ('22222222-2222-2222-2222-222222222005', 'Regular Member', 'en')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Test Memberships
-- ----------------------------------------------------------------------------

-- Admin membership
INSERT INTO memberships (id, user_id, tenant_id, role, status) VALUES
  ('33333333-3333-3333-3333-333333333001', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111111', 'admin', 'active')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Pastor membership
INSERT INTO memberships (id, user_id, tenant_id, role, status) VALUES
  ('33333333-3333-3333-3333-333333333002', '22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111111', 'pastor', 'active')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Zone leader membership
INSERT INTO memberships (id, user_id, tenant_id, role, status) VALUES
  ('33333333-3333-3333-3333-333333333003', '22222222-2222-2222-2222-222222222003', '11111111-1111-1111-1111-111111111111', 'zone_leader', 'active')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Small group leader membership
INSERT INTO memberships (id, user_id, tenant_id, role, status) VALUES
  ('33333333-3333-3333-3333-333333333004', '22222222-2222-2222-2222-222222222004', '11111111-1111-1111-1111-111111111111', 'small_group_leader', 'active')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Regular member membership
INSERT INTO memberships (id, user_id, tenant_id, role, status) VALUES
  ('33333333-3333-3333-3333-333333333005', '22222222-2222-2222-2222-222222222005', '11111111-1111-1111-1111-111111111111', 'member', 'active')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Test Zones
-- ----------------------------------------------------------------------------

INSERT INTO zones (id, tenant_id, name, zone_leader_id) VALUES
  ('44444444-4444-4444-4444-444444444001', '11111111-1111-1111-1111-111111111111', 'Zone A', '33333333-3333-3333-3333-333333333003')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Test Small Groups
-- ----------------------------------------------------------------------------

INSERT INTO small_groups (id, tenant_id, zone_id, name, leader_id) VALUES
  ('55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444001', 'Alpha Group', '33333333-3333-3333-3333-333333333004'),
  ('55555555-5555-5555-5555-555555555502', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444001', 'Beta Group', '33333333-3333-3333-3333-333333333004')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Update small group leader membership with small_group_id
UPDATE memberships
SET small_group_id = '55555555-5555-5555-5555-555555555501'
WHERE id = '33333333-3333-3333-3333-333333333004';

-- ----------------------------------------------------------------------------
-- Test Ministries
-- ----------------------------------------------------------------------------

INSERT INTO ministries (id, tenant_id, name, description) VALUES
  ('66666666-6666-6666-6666-666666666601', '11111111-1111-1111-1111-111111111111', 'Worship Team', 'Music and worship ministry'),
  ('66666666-6666-6666-6666-666666666602', '11111111-1111-1111-1111-111111111111', 'Youth Ministry', 'Middle and high school ministry')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Test Ministry Memberships
-- ----------------------------------------------------------------------------

INSERT INTO ministry_memberships (membership_id, ministry_id) VALUES
  ('33333333-3333-3333-3333-333333333005', '66666666-6666-6666-6666-666666666601'),
  ('33333333-3333-3333-3333-333333333005', '66666666-6666-6666-6666-666666666602')
ON CONFLICT (membership_id, ministry_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Test Conversations
-- ----------------------------------------------------------------------------

-- Church-wide conversation
INSERT INTO conversations (id, tenant_id, type, name) VALUES
  ('77777777-7777-7777-7777-777777777701', '11111111-1111-1111-1111-111111111111', 'church_wide', 'General Announcements')
ON CONFLICT DO NOTHING;

-- Small group conversation
INSERT INTO conversations (id, tenant_id, type, name, small_group_id) VALUES
  ('77777777-7777-7777-7777-777777777702', '11111111-1111-1111-1111-111111111111', 'small_group', 'Alpha Group Chat', '55555555-5555-5555-5555-555555555501')
ON CONFLICT DO NOTHING;

-- Ministry conversation
INSERT INTO conversations (id, tenant_id, type, name, ministry_id) VALUES
  ('77777777-7777-7777-7777-777777777703', '11111111-1111-1111-1111-111111111111', 'ministry', 'Worship Team Chat', '66666666-6666-6666-6666-666666666601')
ON CONFLICT DO NOTHING;

-- Direct conversation (admin and member)
INSERT INTO conversations (id, tenant_id, type) VALUES
  ('77777777-7777-7777-7777-777777777704', '11111111-1111-1111-1111-111111111111', 'direct')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Test Conversation Participants (for direct conversation)
-- ----------------------------------------------------------------------------

INSERT INTO conversation_participants (conversation_id, membership_id) VALUES
  ('77777777-7777-7777-7777-777777777704', '33333333-3333-3333-3333-333333333001'),
  ('77777777-7777-7777-7777-777777777704', '33333333-3333-3333-3333-333333333005')
ON CONFLICT (conversation_id, membership_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Test Messages
-- ----------------------------------------------------------------------------

INSERT INTO messages (id, tenant_id, conversation_id, sender_id, content, content_type) VALUES
  ('88888888-8888-8888-8888-888888888801', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777701', '33333333-3333-3333-3333-333333333001', 'Welcome to Test Church!', 'text'),
  ('88888888-8888-8888-8888-888888888802', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777702', '33333333-3333-3333-3333-333333333004', 'Hello Alpha Group!', 'text'),
  ('88888888-8888-8888-8888-888888888803', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777704', '33333333-3333-3333-3333-333333333005', 'Hi admin!', 'text')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Test Prayer Cards
-- ----------------------------------------------------------------------------

INSERT INTO prayer_cards (id, tenant_id, author_id, content, recipient_scope) VALUES
  ('99999999-9999-9999-9999-999999999901', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333005', 'Please pray for my job interview tomorrow.', 'church_wide'),
  ('99999999-9999-9999-9999-999999999902', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333005', 'Prayer request for my family.', 'individual'),
  ('99999999-9999-9999-9999-999999999903', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333004', 'Pray for our small group outreach event.', 'small_group')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Test Prayer Card Recipients
-- ----------------------------------------------------------------------------

-- Individual prayer card recipient (admin)
INSERT INTO prayer_card_recipients (prayer_card_id, recipient_membership_id) VALUES
  ('99999999-9999-9999-9999-999999999902', '33333333-3333-3333-3333-333333333001')
ON CONFLICT DO NOTHING;

-- Small group prayer card recipient (Alpha Group)
INSERT INTO prayer_card_recipients (prayer_card_id, recipient_small_group_id) VALUES
  ('99999999-9999-9999-9999-999999999903', '55555555-5555-5555-5555-555555555501')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Test Pastoral Journals
-- ----------------------------------------------------------------------------

INSERT INTO pastoral_journals (id, tenant_id, small_group_id, author_id, week_start_date, content, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', '33333333-3333-3333-3333-333333333004', '2024-01-01', 'This week we had 8 attendees. One new visitor. Prayer requests: health for elderly member.', 'draft'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333004', '2024-01-01', 'Beta group meeting went well. All members present.', 'submitted')
ON CONFLICT (small_group_id, week_start_date) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Test Pastoral Journal Comments
-- ----------------------------------------------------------------------------

INSERT INTO pastoral_journal_comments (id, pastoral_journal_id, author_id, content) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02', '33333333-3333-3333-3333-333333333003', 'Great to hear Beta group is doing well! Keep it up.')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Seed Data Summary
-- ============================================================================
--
-- Created entities:
-- - 1 tenant (Test Church)
-- - 5 users (Admin, Pastor, Zone Leader, Small Group Leader, Member)
-- - 5 memberships (one per user, with various roles)
-- - 1 zone (Zone A)
-- - 2 small groups (Alpha Group, Beta Group)
-- - 2 ministries (Worship Team, Youth Ministry)
-- - 2 ministry memberships
-- - 4 conversations (church_wide, small_group, ministry, direct)
-- - 2 conversation participants (for direct)
-- - 3 messages
-- - 3 prayer cards (one of each scope)
-- - 2 prayer card recipients
-- - 2 pastoral journals (one draft, one submitted)
-- - 1 pastoral journal comment
--
-- Testing credentials (after creating auth.users with matching IDs):
-- - Admin: admin@test.com (role: admin)
-- - Pastor: pastor@test.com (role: pastor)
-- - Zone Leader: zl@test.com (role: zone_leader)
-- - Small Group Leader: sgl@test.com (role: small_group_leader)
-- - Member: member@test.com (role: member)
--
-- ============================================================================
