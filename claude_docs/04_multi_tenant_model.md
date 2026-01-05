# Multi-Tenant Model

This document defines the complete database schema, Row Level Security (RLS) policies, indexes, foreign key constraints, and migration strategy for Gagyo's multi-tenant architecture.

---

## Tenant Isolation Strategy

Gagyo uses a **shared database, shared schema** multi-tenancy approach where:

1. All tenants share the same PostgreSQL database and tables
2. Every table (except `users` and `device_tokens`) includes a `tenant_id` column
3. RLS policies enforce tenant isolation at the database level
4. Users access tenant data only through valid memberships

This approach provides:
- Cost efficiency (single database instance)
- Simplified operations (single schema to manage)
- Strong isolation (RLS enforced at query level)
- Easy cross-tenant queries for super-admin (with bypass)

---

## Schema Definitions

### Core Tables

#### tenants

The root organizational entity representing a church or ministry.

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_created_at ON tenants(created_at);

-- Updated at trigger
CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

#### users

Extended user profile data (supplements Supabase auth.users).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  photo_url TEXT,
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ko')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_created_at ON users(created_at);

-- Updated at trigger
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

#### memberships

Relationship between users and tenants with role assignment.

```sql
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'small_group_leader', 'zone_leader', 'pastor', 'admin')),
  small_group_id UUID REFERENCES small_groups(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, tenant_id)
);

-- Indexes
CREATE INDEX idx_memberships_tenant_id ON memberships(tenant_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_small_group_id ON memberships(small_group_id);
CREATE INDEX idx_memberships_tenant_role ON memberships(tenant_id, role);
CREATE INDEX idx_memberships_tenant_status ON memberships(tenant_id, status);

-- Updated at trigger
CREATE TRIGGER set_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### Organizational Tables

#### zones

Organizational unit grouping multiple small groups.

```sql
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone_leader_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX idx_zones_tenant_id ON zones(tenant_id);
CREATE INDEX idx_zones_zone_leader_id ON zones(zone_leader_id);

-- Updated at trigger
CREATE TRIGGER set_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

#### small_groups

Cell groups with leader assignments.

```sql
CREATE TABLE small_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  leader_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  co_leader_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX idx_small_groups_tenant_id ON small_groups(tenant_id);
CREATE INDEX idx_small_groups_zone_id ON small_groups(zone_id);
CREATE INDEX idx_small_groups_leader_id ON small_groups(leader_id);

-- Updated at trigger
CREATE TRIGGER set_small_groups_updated_at
  BEFORE UPDATE ON small_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

#### ministries

Ministry teams or departments.

```sql
CREATE TABLE ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX idx_ministries_tenant_id ON ministries(tenant_id);

-- Updated at trigger
CREATE TRIGGER set_ministries_updated_at
  BEFORE UPDATE ON ministries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

#### ministry_memberships

User-ministry relationships.

```sql
CREATE TABLE ministry_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(membership_id, ministry_id)
);

-- Indexes
CREATE INDEX idx_ministry_memberships_membership_id ON ministry_memberships(membership_id);
CREATE INDEX idx_ministry_memberships_ministry_id ON ministry_memberships(ministry_id);
```

---

### Communication Tables

#### conversations

Chat channels of various types.

```sql
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

-- Indexes
CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX idx_conversations_tenant_updated ON conversations(tenant_id, updated_at DESC);
CREATE INDEX idx_conversations_small_group_id ON conversations(small_group_id);
CREATE INDEX idx_conversations_ministry_id ON conversations(ministry_id);
CREATE INDEX idx_conversations_type ON conversations(tenant_id, type);

-- Updated at trigger
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

#### conversation_participants

Explicit participants for direct and custom conversations.

```sql
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(conversation_id, membership_id)
);

-- Indexes
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_membership_id ON conversation_participants(membership_id);
```

---

#### messages

Individual messages within conversations.

```sql
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

-- Indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_parent_id ON messages(parent_id);
CREATE INDEX idx_messages_not_deleted ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;

-- Updated at trigger
CREATE TRIGGER set_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

#### event_chat_exclusions

Users excluded from seeing specific Event Chat messages.

```sql
CREATE TABLE event_chat_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  excluded_membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(message_id, excluded_membership_id)
);

-- Indexes
CREATE INDEX idx_event_chat_exclusions_message_id ON event_chat_exclusions(message_id);
CREATE INDEX idx_event_chat_exclusions_excluded_membership_id ON event_chat_exclusions(excluded_membership_id);
```

---

### Prayer Tables

#### prayer_cards

Prayer requests with visibility scoping.

```sql
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

-- Indexes
CREATE INDEX idx_prayer_cards_tenant_id ON prayer_cards(tenant_id);
CREATE INDEX idx_prayer_cards_tenant_created ON prayer_cards(tenant_id, created_at DESC);
CREATE INDEX idx_prayer_cards_author_id ON prayer_cards(author_id);
CREATE INDEX idx_prayer_cards_answered ON prayer_cards(tenant_id, answered, created_at DESC);

-- Updated at trigger
CREATE TRIGGER set_prayer_cards_updated_at
  BEFORE UPDATE ON prayer_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

#### prayer_card_recipients

Defines visibility for individual and small_group scoped prayer cards.

```sql
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

-- Indexes
CREATE INDEX idx_prayer_card_recipients_prayer_card_id ON prayer_card_recipients(prayer_card_id);
CREATE INDEX idx_prayer_card_recipients_membership_id ON prayer_card_recipients(recipient_membership_id);
CREATE INDEX idx_prayer_card_recipients_small_group_id ON prayer_card_recipients(recipient_small_group_id);
```

---

### Pastoral Care Tables

#### pastoral_journals

Weekly pastoral reports from small group leaders.

```sql
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

-- Indexes
CREATE INDEX idx_pastoral_journals_tenant_id ON pastoral_journals(tenant_id);
CREATE INDEX idx_pastoral_journals_small_group_id ON pastoral_journals(small_group_id);
CREATE INDEX idx_pastoral_journals_author_id ON pastoral_journals(author_id);
CREATE INDEX idx_pastoral_journals_status ON pastoral_journals(tenant_id, status);
CREATE INDEX idx_pastoral_journals_week ON pastoral_journals(tenant_id, week_start_date DESC);

-- Updated at trigger
CREATE TRIGGER set_pastoral_journals_updated_at
  BEFORE UPDATE ON pastoral_journals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

#### pastoral_journal_comments

Comments from zone leaders and pastors.

```sql
CREATE TABLE pastoral_journal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pastoral_journal_id UUID NOT NULL REFERENCES pastoral_journals(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES memberships(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pastoral_journal_comments_journal_id ON pastoral_journal_comments(pastoral_journal_id);
CREATE INDEX idx_pastoral_journal_comments_author_id ON pastoral_journal_comments(author_id);

-- Updated at trigger
CREATE TRIGGER set_pastoral_journal_comments_updated_at
  BEFORE UPDATE ON pastoral_journal_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### Notification Tables

#### notifications

In-app notifications for users.

```sql
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

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);
```

---

#### device_tokens

Push notification tokens (global, not tenant-scoped).

```sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_token ON device_tokens(token);
CREATE INDEX idx_device_tokens_active ON device_tokens(user_id) WHERE revoked_at IS NULL;
```

---

### Attachment Table

#### attachments

File attachments for messages and prayer cards.

```sql
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

-- Indexes
CREATE INDEX idx_attachments_tenant_id ON attachments(tenant_id);
CREATE INDEX idx_attachments_message_id ON attachments(message_id);
CREATE INDEX idx_attachments_prayer_card_id ON attachments(prayer_card_id);
```

---

## Helper Functions

```sql
-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
```

---

## Row Level Security Policies

### Enable RLS on All Tables

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE small_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_chat_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_card_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastoral_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastoral_journal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
```

---

### Tenants Policies

```sql
-- Users can view tenants they are members of
CREATE POLICY "Users can view their tenants"
  ON tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = tenants.id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'active'
    )
  );

-- Only admins can update tenant settings
CREATE POLICY "Admins can update tenants"
  ON tenants FOR UPDATE
  USING (has_role(id, 'admin'))
  WITH CHECK (has_role(id, 'admin'));
```

---

### Users Policies

```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Users can view profiles of people in shared tenants
CREATE POLICY "Users can view profiles in shared tenants"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m1
      JOIN memberships m2 ON m1.tenant_id = m2.tenant_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = users.id
        AND m1.status = 'active'
        AND m2.status = 'active'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile (on first sign-in)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());
```

---

### Memberships Policies

```sql
-- Users can view memberships in their tenants
CREATE POLICY "Users can view memberships in their tenants"
  ON memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.tenant_id = memberships.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

-- Admins can manage memberships
CREATE POLICY "Admins can insert memberships"
  ON memberships FOR INSERT
  WITH CHECK (has_role(tenant_id, 'admin'));

CREATE POLICY "Admins can update memberships"
  ON memberships FOR UPDATE
  USING (has_role(tenant_id, 'admin'))
  WITH CHECK (has_role(tenant_id, 'admin'));

CREATE POLICY "Admins can delete memberships"
  ON memberships FOR DELETE
  USING (has_role(tenant_id, 'admin'));
```

---

### Zones Policies

```sql
-- Users can view zones in their tenants
CREATE POLICY "Users can view zones"
  ON zones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = zones.tenant_id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'active'
    )
  );

-- Admins can manage zones
CREATE POLICY "Admins can manage zones"
  ON zones FOR ALL
  USING (has_role(tenant_id, 'admin'))
  WITH CHECK (has_role(tenant_id, 'admin'));
```

---

### Small Groups Policies

```sql
-- Users can view small groups in their tenants
CREATE POLICY "Users can view small groups"
  ON small_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = small_groups.tenant_id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'active'
    )
  );

-- Admins can manage small groups
CREATE POLICY "Admins can manage small groups"
  ON small_groups FOR ALL
  USING (has_role(tenant_id, 'admin'))
  WITH CHECK (has_role(tenant_id, 'admin'));
```

---

### Ministries Policies

```sql
-- Users can view ministries in their tenants
CREATE POLICY "Users can view ministries"
  ON ministries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = ministries.tenant_id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'active'
    )
  );

-- Admins can manage ministries
CREATE POLICY "Admins can manage ministries"
  ON ministries FOR ALL
  USING (has_role(tenant_id, 'admin'))
  WITH CHECK (has_role(tenant_id, 'admin'));
```

---

### Conversations Policies

```sql
-- Users can view conversations they have access to
CREATE POLICY "Users can view accessible conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.tenant_id = conversations.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND (
          -- Church-wide: all members
          conversations.type = 'church_wide'
          -- Small group: members of that group
          OR (conversations.type = 'small_group' AND m.small_group_id = conversations.small_group_id)
          -- Ministry: members of that ministry
          OR (conversations.type = 'ministry' AND EXISTS (
            SELECT 1 FROM ministry_memberships mm
            WHERE mm.membership_id = m.id AND mm.ministry_id = conversations.ministry_id
          ))
          -- Direct: explicit participant
          OR (conversations.type = 'direct' AND EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversations.id AND cp.membership_id = m.id
          ))
        )
    )
  );

-- Users can create direct conversations
CREATE POLICY "Users can create direct conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    type = 'direct' AND
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = conversations.tenant_id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'active'
    )
  );
```

---

### Messages Policies

```sql
-- Users can view messages in conversations they can access
-- Excludes Event Chat messages where user is excluded
CREATE POLICY "Users can view messages"
  ON messages FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN memberships m ON m.tenant_id = c.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
      WHERE c.id = messages.conversation_id
        AND (
          c.type = 'church_wide'
          OR (c.type = 'small_group' AND m.small_group_id = c.small_group_id)
          OR (c.type = 'ministry' AND EXISTS (
            SELECT 1 FROM ministry_memberships mm WHERE mm.membership_id = m.id AND mm.ministry_id = c.ministry_id
          ))
          OR (c.type = 'direct' AND EXISTS (
            SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.membership_id = m.id
          ))
        )
        -- Exclude Event Chat messages where user is excluded
        AND NOT (
          messages.is_event_chat = TRUE AND EXISTS (
            SELECT 1 FROM event_chat_exclusions ece
            WHERE ece.message_id = messages.id AND ece.excluded_membership_id = m.id
          )
        )
    )
  );

-- Users can send messages to conversations they can access
CREATE POLICY "Users can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = get_user_membership(tenant_id) AND
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN memberships m ON m.tenant_id = c.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
      WHERE c.id = messages.conversation_id
        AND (
          c.type = 'church_wide'
          OR (c.type = 'small_group' AND m.small_group_id = c.small_group_id)
          OR (c.type = 'ministry' AND EXISTS (
            SELECT 1 FROM ministry_memberships mm WHERE mm.membership_id = m.id AND mm.ministry_id = c.ministry_id
          ))
          OR (c.type = 'direct' AND EXISTS (
            SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.membership_id = m.id
          ))
        )
    )
  );

-- Users can soft-delete their own messages
CREATE POLICY "Users can delete own messages"
  ON messages FOR UPDATE
  USING (sender_id = get_user_membership(tenant_id))
  WITH CHECK (sender_id = get_user_membership(tenant_id));
```

---

### Prayer Cards Policies

```sql
-- Users can view prayer cards based on recipient scope
CREATE POLICY "Users can view prayer cards"
  ON prayer_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.tenant_id = prayer_cards.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND (
          -- Author can always see their own
          prayer_cards.author_id = m.id
          -- Church-wide: all members
          OR prayer_cards.recipient_scope = 'church_wide'
          -- Individual: user is explicit recipient
          OR (prayer_cards.recipient_scope = 'individual' AND EXISTS (
            SELECT 1 FROM prayer_card_recipients pcr
            WHERE pcr.prayer_card_id = prayer_cards.id AND pcr.recipient_membership_id = m.id
          ))
          -- Small group: user is in the recipient group
          OR (prayer_cards.recipient_scope = 'small_group' AND EXISTS (
            SELECT 1 FROM prayer_card_recipients pcr
            WHERE pcr.prayer_card_id = prayer_cards.id AND pcr.recipient_small_group_id = m.small_group_id
          ))
        )
    )
  );

-- Users can create prayer cards
CREATE POLICY "Users can create prayer cards"
  ON prayer_cards FOR INSERT
  WITH CHECK (
    author_id = get_user_membership(tenant_id)
  );

-- Users can update their own prayer cards (e.g., mark as answered)
CREATE POLICY "Users can update own prayer cards"
  ON prayer_cards FOR UPDATE
  USING (author_id = get_user_membership(tenant_id))
  WITH CHECK (author_id = get_user_membership(tenant_id));
```

---

### Pastoral Journals Policies

```sql
-- Role-based viewing of pastoral journals
CREATE POLICY "Role-based view of pastoral journals"
  ON pastoral_journals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.tenant_id = pastoral_journals.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND (
          -- Pastors and admins can see all
          m.role IN ('pastor', 'admin')
          -- Zone leaders can see journals from groups in their zone
          OR (m.role = 'zone_leader' AND EXISTS (
            SELECT 1 FROM small_groups sg
            JOIN zones z ON sg.zone_id = z.id
            WHERE sg.id = pastoral_journals.small_group_id AND z.zone_leader_id = m.id
          ))
          -- Small group leaders can see their own group's journals
          OR (m.role = 'small_group_leader' AND EXISTS (
            SELECT 1 FROM small_groups sg
            WHERE sg.id = pastoral_journals.small_group_id
              AND (sg.leader_id = m.id OR sg.co_leader_id = m.id)
          ))
          -- Authors can see their own drafts
          OR pastoral_journals.author_id = m.id
        )
    )
  );

-- Small group leaders can create journals for their group
CREATE POLICY "Leaders can create pastoral journals"
  ON pastoral_journals FOR INSERT
  WITH CHECK (
    author_id = get_user_membership(tenant_id) AND
    EXISTS (
      SELECT 1 FROM small_groups sg
      JOIN memberships m ON (sg.leader_id = m.id OR sg.co_leader_id = m.id)
      WHERE sg.id = pastoral_journals.small_group_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

-- Status updates based on role
CREATE POLICY "Role-based update of pastoral journals"
  ON pastoral_journals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.tenant_id = pastoral_journals.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND (
          -- Authors can update drafts
          (pastoral_journals.author_id = m.id AND pastoral_journals.status = 'draft')
          -- Authors can submit (draft -> submitted)
          OR (pastoral_journals.author_id = m.id AND pastoral_journals.status = 'draft')
          -- Zone leaders can forward (submitted -> zone_reviewed)
          OR (m.role = 'zone_leader' AND EXISTS (
            SELECT 1 FROM small_groups sg
            JOIN zones z ON sg.zone_id = z.id
            WHERE sg.id = pastoral_journals.small_group_id AND z.zone_leader_id = m.id
          ) AND pastoral_journals.status = 'submitted')
          -- Pastors can confirm (zone_reviewed -> pastor_confirmed)
          OR (m.role IN ('pastor', 'admin') AND pastoral_journals.status = 'zone_reviewed')
        )
    )
  );
```

---

### Notifications Policies

```sql
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notifications are created by Edge Functions (service role)
-- No INSERT policy for authenticated users
```

---

### Device Tokens Policies

```sql
-- Users can view their own device tokens
CREATE POLICY "Users can view own device tokens"
  ON device_tokens FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own device tokens
CREATE POLICY "Users can insert device tokens"
  ON device_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own device tokens
CREATE POLICY "Users can update own device tokens"
  ON device_tokens FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own device tokens
CREATE POLICY "Users can delete own device tokens"
  ON device_tokens FOR DELETE
  USING (user_id = auth.uid());
```

---

### Attachments Policies

```sql
-- Attachments follow the same access rules as their parent entity
CREATE POLICY "Users can view attachments"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.tenant_id = attachments.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND (
          -- Message attachments: can view the parent message
          (attachments.message_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM messages msg WHERE msg.id = attachments.message_id
            -- The messages RLS policy will further restrict this
          ))
          -- Prayer card attachments: can view the parent prayer card
          OR (attachments.prayer_card_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM prayer_cards pc WHERE pc.id = attachments.prayer_card_id
            -- The prayer_cards RLS policy will further restrict this
          ))
        )
    )
  );

-- Users can create attachments for their own content
CREATE POLICY "Users can create attachments"
  ON attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.tenant_id = attachments.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND (
          (attachments.message_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM messages msg WHERE msg.id = attachments.message_id AND msg.sender_id = m.id
          ))
          OR (attachments.prayer_card_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM prayer_cards pc WHERE pc.id = attachments.prayer_card_id AND pc.author_id = m.id
          ))
        )
    )
  );
```

---

## Migration Strategy

### Migration Order

Execute migrations in this order to satisfy foreign key dependencies:

1. **Core infrastructure**
   - Helper functions (`update_updated_at_column`, etc.)

2. **Base tables (no foreign keys to other app tables)**
   - `tenants`
   - `users`

3. **Organizational structure**
   - `memberships` (references users, tenants)
   - `zones` (references tenants)
   - `small_groups` (references tenants, zones)
   - `ministries` (references tenants)
   - `ministry_memberships` (references memberships, ministries)

4. **Update memberships** (add small_group_id FK after small_groups exists)
   - Add FK constraint for `memberships.small_group_id`

5. **Update zones and small_groups** (add leader FKs after memberships exists)
   - Add FK constraints for leader columns

6. **Communication**
   - `conversations` (references tenants, small_groups, ministries)
   - `conversation_participants` (references conversations, memberships)
   - `messages` (references tenants, conversations, memberships)
   - `event_chat_exclusions` (references messages, memberships)

7. **Prayer**
   - `prayer_cards` (references tenants, memberships)
   - `prayer_card_recipients` (references prayer_cards, memberships, small_groups)

8. **Pastoral care**
   - `pastoral_journals` (references tenants, small_groups, memberships)
   - `pastoral_journal_comments` (references pastoral_journals, memberships)

9. **Notifications**
   - `notifications` (references tenants, users)
   - `device_tokens` (references users)

10. **Attachments**
    - `attachments` (references tenants, messages, prayer_cards)

11. **Enable RLS** on all tables

12. **Create RLS policies** (after all tables and functions exist)

13. **Create indexes** (can be done in parallel after tables exist)

### Seed Data

For development and testing, create seed data:

```sql
-- Test tenant
INSERT INTO tenants (id, name, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Church', 'test-church');

-- Test users (after auth.users are created)
-- These would be created via Supabase Auth

-- Test memberships with various roles
-- Created after users exist
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-04 | Claude | Initial complete schema with RLS policies |
