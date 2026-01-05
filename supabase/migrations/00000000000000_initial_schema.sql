-- ============================================================================
-- Gagyo Backend Schema - Initial Migration
-- ============================================================================
-- This migration creates all tables, indexes, triggers, and helper functions
-- for the Gagyo multi-tenant church communication platform.
--
-- Tables are created in dependency order to satisfy foreign key constraints.
--
-- See: claude_docs/04_multi_tenant_model.md for complete schema documentation
-- See: claude_docs/01_domain_glossary.md for domain ontology
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper Functions (trigger function only - others after tables exist)
-- ----------------------------------------------------------------------------

-- Updated at trigger function (used by all tables with updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Core Tables (no foreign keys to other app tables)
-- ----------------------------------------------------------------------------

-- Tenants Table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_created_at ON tenants(created_at);

CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Users Table (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  photo_url TEXT,
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ko')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_created_at ON users(created_at);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Memberships Table
-- Note: small_group_id FK added later after small_groups table exists
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'small_group_leader', 'zone_leader', 'pastor', 'admin')),
  small_group_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_memberships_tenant_id ON memberships(tenant_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_small_group_id ON memberships(small_group_id);
CREATE INDEX idx_memberships_tenant_role ON memberships(tenant_id, role);
CREATE INDEX idx_memberships_tenant_status ON memberships(tenant_id, status);

CREATE TRIGGER set_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Additional Helper Functions (require memberships table to exist)
-- ----------------------------------------------------------------------------

-- Get current user's membership in a tenant
CREATE OR REPLACE FUNCTION get_user_membership(p_tenant_id UUID)
RETURNS UUID AS $$
  SELECT id FROM memberships
  WHERE user_id = auth.uid()
    AND tenant_id = p_tenant_id
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's role in a tenant
CREATE OR REPLACE FUNCTION get_user_role(p_tenant_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM memberships
  WHERE user_id = auth.uid()
    AND tenant_id = p_tenant_id
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user has at least the specified role in a tenant
CREATE OR REPLACE FUNCTION has_role(p_tenant_id UUID, p_min_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_role_hierarchy TEXT[] := ARRAY['member', 'small_group_leader', 'zone_leader', 'pastor', 'admin'];
BEGIN
  SELECT role INTO v_user_role FROM memberships
  WHERE user_id = auth.uid()
    AND tenant_id = p_tenant_id
    AND status = 'active'
  LIMIT 1;

  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN array_position(v_role_hierarchy, v_user_role) >= array_position(v_role_hierarchy, p_min_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- Organizational Tables
-- ----------------------------------------------------------------------------

-- Zones Table
-- Note: zone_leader_id FK added later after memberships data exists
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone_leader_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_zones_tenant_id ON zones(tenant_id);

CREATE TRIGGER set_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Small Groups Table
-- Note: leader_id and co_leader_id FKs added later after memberships data exists
CREATE TABLE small_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  leader_id UUID,
  co_leader_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_small_groups_tenant_id ON small_groups(tenant_id);
CREATE INDEX idx_small_groups_zone_id ON small_groups(zone_id);

CREATE TRIGGER set_small_groups_updated_at
  BEFORE UPDATE ON small_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ministries Table
CREATE TABLE ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_ministries_tenant_id ON ministries(tenant_id);

CREATE TRIGGER set_ministries_updated_at
  BEFORE UPDATE ON ministries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ministry Memberships Table
CREATE TABLE ministry_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(membership_id, ministry_id)
);

CREATE INDEX idx_ministry_memberships_membership_id ON ministry_memberships(membership_id);
CREATE INDEX idx_ministry_memberships_ministry_id ON ministry_memberships(ministry_id);

-- ----------------------------------------------------------------------------
-- Add Foreign Key Constraints (after all referenced tables exist)
-- ----------------------------------------------------------------------------

-- Memberships.small_group_id FK
ALTER TABLE memberships
  ADD CONSTRAINT memberships_small_group_id_fkey
  FOREIGN KEY (small_group_id) REFERENCES small_groups(id) ON DELETE SET NULL;

-- Zones.zone_leader_id FK
ALTER TABLE zones
  ADD CONSTRAINT zones_zone_leader_id_fkey
  FOREIGN KEY (zone_leader_id) REFERENCES memberships(id) ON DELETE SET NULL;

-- Small Groups leader FKs
ALTER TABLE small_groups
  ADD CONSTRAINT small_groups_leader_id_fkey
  FOREIGN KEY (leader_id) REFERENCES memberships(id) ON DELETE SET NULL;

ALTER TABLE small_groups
  ADD CONSTRAINT small_groups_co_leader_id_fkey
  FOREIGN KEY (co_leader_id) REFERENCES memberships(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- Communication Tables
-- ----------------------------------------------------------------------------

-- Conversations Table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('direct', 'small_group', 'ministry', 'church_wide')),
  name TEXT,
  small_group_id UUID REFERENCES small_groups(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX idx_conversations_tenant_updated ON conversations(tenant_id, updated_at DESC);
CREATE INDEX idx_conversations_small_group_id ON conversations(small_group_id);
CREATE INDEX idx_conversations_ministry_id ON conversations(ministry_id);
CREATE INDEX idx_conversations_type ON conversations(tenant_id, type);

CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Conversation Participants Table
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(conversation_id, membership_id)
);

CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_membership_id ON conversation_participants(membership_id);

-- Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES memberships(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  content TEXT,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'prayer_card', 'system')),
  is_event_chat BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_parent_id ON messages(parent_id);
CREATE INDEX idx_messages_not_deleted ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER set_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Event Chat Exclusions Table
CREATE TABLE event_chat_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  excluded_membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(message_id, excluded_membership_id)
);

CREATE INDEX idx_event_chat_exclusions_message_id ON event_chat_exclusions(message_id);
CREATE INDEX idx_event_chat_exclusions_excluded_membership_id ON event_chat_exclusions(excluded_membership_id);

-- ----------------------------------------------------------------------------
-- Prayer Tables
-- ----------------------------------------------------------------------------

-- Prayer Cards Table
CREATE TABLE prayer_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES memberships(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  recipient_scope TEXT NOT NULL CHECK (recipient_scope IN ('individual', 'small_group', 'church_wide')),
  answered BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prayer_cards_tenant_id ON prayer_cards(tenant_id);
CREATE INDEX idx_prayer_cards_tenant_created ON prayer_cards(tenant_id, created_at DESC);
CREATE INDEX idx_prayer_cards_author_id ON prayer_cards(author_id);
CREATE INDEX idx_prayer_cards_answered ON prayer_cards(tenant_id, answered, created_at DESC);

CREATE TRIGGER set_prayer_cards_updated_at
  BEFORE UPDATE ON prayer_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Prayer Card Recipients Table
CREATE TABLE prayer_card_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_card_id UUID NOT NULL REFERENCES prayer_cards(id) ON DELETE CASCADE,
  recipient_membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
  recipient_small_group_id UUID REFERENCES small_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Either membership or small_group, not both
  CHECK (
    (recipient_membership_id IS NOT NULL AND recipient_small_group_id IS NULL) OR
    (recipient_membership_id IS NULL AND recipient_small_group_id IS NOT NULL)
  )
);

CREATE INDEX idx_prayer_card_recipients_prayer_card_id ON prayer_card_recipients(prayer_card_id);
CREATE INDEX idx_prayer_card_recipients_membership_id ON prayer_card_recipients(recipient_membership_id);
CREATE INDEX idx_prayer_card_recipients_small_group_id ON prayer_card_recipients(recipient_small_group_id);

-- ----------------------------------------------------------------------------
-- Pastoral Care Tables
-- ----------------------------------------------------------------------------

-- Pastoral Journals Table
CREATE TABLE pastoral_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  small_group_id UUID NOT NULL REFERENCES small_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES memberships(id) ON DELETE SET NULL,
  week_start_date DATE NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'zone_reviewed', 'pastor_confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(small_group_id, week_start_date)
);

CREATE INDEX idx_pastoral_journals_tenant_id ON pastoral_journals(tenant_id);
CREATE INDEX idx_pastoral_journals_small_group_id ON pastoral_journals(small_group_id);
CREATE INDEX idx_pastoral_journals_author_id ON pastoral_journals(author_id);
CREATE INDEX idx_pastoral_journals_status ON pastoral_journals(tenant_id, status);
CREATE INDEX idx_pastoral_journals_week ON pastoral_journals(tenant_id, week_start_date DESC);

CREATE TRIGGER set_pastoral_journals_updated_at
  BEFORE UPDATE ON pastoral_journals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Pastoral Journal Comments Table
CREATE TABLE pastoral_journal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pastoral_journal_id UUID NOT NULL REFERENCES pastoral_journals(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES memberships(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pastoral_journal_comments_journal_id ON pastoral_journal_comments(pastoral_journal_id);
CREATE INDEX idx_pastoral_journal_comments_author_id ON pastoral_journal_comments(author_id);

CREATE TRIGGER set_pastoral_journal_comments_updated_at
  BEFORE UPDATE ON pastoral_journal_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Notification Tables
-- ----------------------------------------------------------------------------

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_message', 'mention', 'prayer_answered', 'pastoral_journal_submitted', 'pastoral_journal_forwarded', 'pastoral_journal_confirmed', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);

-- Device Tokens Table (tenant-scoped for multi-tenant isolation)
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,

  -- Token must be unique per tenant (same token can exist in different tenants)
  UNIQUE(tenant_id, token)
);

CREATE INDEX idx_device_tokens_tenant_id ON device_tokens(tenant_id);
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_token ON device_tokens(token);
CREATE INDEX idx_device_tokens_tenant_user ON device_tokens(tenant_id, user_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(tenant_id, user_id) WHERE revoked_at IS NULL;

-- ----------------------------------------------------------------------------
-- Attachment Table
-- ----------------------------------------------------------------------------

-- Attachments Table
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  prayer_card_id UUID REFERENCES prayer_cards(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Must belong to either message or prayer_card
  CHECK (
    (message_id IS NOT NULL AND prayer_card_id IS NULL) OR
    (message_id IS NULL AND prayer_card_id IS NOT NULL)
  )
);

CREATE INDEX idx_attachments_tenant_id ON attachments(tenant_id);
CREATE INDEX idx_attachments_message_id ON attachments(message_id);
CREATE INDEX idx_attachments_prayer_card_id ON attachments(prayer_card_id);

-- ============================================================================
-- End of Migration
-- ============================================================================
