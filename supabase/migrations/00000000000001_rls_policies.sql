-- ============================================================================
-- Gagyo Backend Schema - RLS Policies Migration
-- ============================================================================
-- This migration enables Row Level Security on all tables and creates
-- comprehensive policies to enforce tenant isolation and role-based access.
--
-- RLS ensures that:
-- 1. Users can only access data from tenants they are members of
-- 2. Cross-tenant data access is impossible at the database level
-- 3. Role-based access is enforced (e.g., pastoral journals)
-- 4. Event Chat exclusions work correctly
--
-- See: claude_docs/04_multi_tenant_model.md for complete RLS documentation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enable RLS on All Tables
-- ----------------------------------------------------------------------------

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

-- ============================================================================
-- POLICIES: Core Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tenants Policies
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Users Policies
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Memberships Policies
-- ----------------------------------------------------------------------------

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

-- Admins can insert memberships
CREATE POLICY "Admins can insert memberships"
  ON memberships FOR INSERT
  WITH CHECK (has_role(tenant_id, 'admin'));

-- Admins can update memberships
CREATE POLICY "Admins can update memberships"
  ON memberships FOR UPDATE
  USING (has_role(tenant_id, 'admin'))
  WITH CHECK (has_role(tenant_id, 'admin'));

-- Admins can delete memberships
CREATE POLICY "Admins can delete memberships"
  ON memberships FOR DELETE
  USING (has_role(tenant_id, 'admin'));

-- ============================================================================
-- POLICIES: Organizational Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Zones Policies
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Small Groups Policies
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Ministries Policies
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Ministry Memberships Policies
-- ----------------------------------------------------------------------------

-- Users can view ministry memberships in their tenants
CREATE POLICY "Users can view ministry memberships in their tenants"
  ON ministry_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN ministries min ON min.id = ministry_memberships.ministry_id
      WHERE m.id = ministry_memberships.membership_id
        AND m.tenant_id = min.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

-- Users can join ministries in their tenant
CREATE POLICY "Users can join ministries"
  ON ministry_memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN ministries min ON min.id = ministry_memberships.ministry_id
      WHERE m.id = ministry_memberships.membership_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.tenant_id = min.tenant_id
    )
  );

-- Users can leave ministries
CREATE POLICY "Users can leave ministries"
  ON ministry_memberships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.id = membership_id
        AND m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES: Communication Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Conversations Policies
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Conversation Participants Policies
-- ----------------------------------------------------------------------------

-- Users can view participants for conversations they can access
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.tenant_id = (
            SELECT m.tenant_id FROM memberships m
            WHERE m.id = conversation_participants.membership_id
          )
        AND EXISTS (
          SELECT 1 FROM memberships m2
          WHERE m2.tenant_id = c.tenant_id
            AND m2.user_id = auth.uid()
            AND m2.status = 'active'
        )
    )
  );

-- Users can add participants to direct conversations they're in
CREATE POLICY "Users can add conversation participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN memberships m ON m.tenant_id = c.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
      WHERE c.id = conversation_participants.conversation_id
        AND c.type = 'direct'
    )
  );

-- Users can update their own last_read_at
CREATE POLICY "Users can update own conversation participant"
  ON conversation_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.id = conversation_participants.membership_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.id = conversation_participants.membership_id
        AND m.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Messages Policies
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Event Chat Exclusions Policies
-- ----------------------------------------------------------------------------

-- Users can view exclusions for messages they can see
CREATE POLICY "Users can view event chat exclusions"
  ON event_chat_exclusions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages msg
      JOIN conversations c ON c.id = msg.conversation_id
      JOIN memberships m ON m.tenant_id = c.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
      WHERE msg.id = event_chat_exclusions.message_id
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

-- Event chat exclusions created by Edge Functions or admins
CREATE POLICY "Admins can create event chat exclusions"
  ON event_chat_exclusions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages msg
      WHERE msg.id = message_id
        AND has_role(msg.tenant_id, 'admin')
    )
  );

-- ============================================================================
-- POLICIES: Prayer Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Prayer Cards Policies
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Prayer Card Recipients Policies
-- ----------------------------------------------------------------------------

-- Users can view recipients for prayer cards they can see
CREATE POLICY "Users can view prayer card recipients"
  ON prayer_card_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prayer_cards pc
      WHERE pc.id = prayer_card_recipients.prayer_card_id
        AND (
          -- Author can see
          pc.author_id = (SELECT id FROM memberships WHERE user_id = auth.uid() AND tenant_id = pc.tenant_id AND status = 'active' LIMIT 1)
          -- Church-wide: all members
          OR pc.recipient_scope = 'church_wide'
          -- Individual: user is recipient
          OR (pc.recipient_scope = 'individual' AND EXISTS (
            SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.id = prayer_card_recipients.recipient_membership_id
          ))
          -- Small group: user is in the group
          OR (pc.recipient_scope = 'small_group' AND EXISTS (
            SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.small_group_id = prayer_card_recipients.recipient_small_group_id
          ))
        )
    )
  );

-- Prayer card recipients created when prayer cards are created
CREATE POLICY "Prayer card recipients follow prayer card access"
  ON prayer_card_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prayer_cards pc
      WHERE pc.id = prayer_card_recipients.prayer_card_id
        AND pc.author_id = get_user_membership(pc.tenant_id)
    )
  );

-- ============================================================================
-- POLICIES: Pastoral Care Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Pastoral Journals Policies
-- ----------------------------------------------------------------------------

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
-- Note: UPDATE policies can only validate the OLD row values
-- Application-level validation is required for status transitions
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
          -- Zone leaders can update submitted journals
          OR (m.role = 'zone_leader' AND EXISTS (
            SELECT 1 FROM small_groups sg
            JOIN zones z ON sg.zone_id = z.id
            WHERE sg.id = pastoral_journals.small_group_id AND z.zone_leader_id = m.id
          ) AND pastoral_journals.status IN ('submitted', 'zone_reviewed'))
          -- Pastors and admins can update any journal
          OR (m.role IN ('pastor', 'admin'))
        )
    )
  );

-- ----------------------------------------------------------------------------
-- Pastoral Journal Comments Policies
-- ----------------------------------------------------------------------------

-- Users can view comments on journals they can access
CREATE POLICY "Users can view pastoral journal comments"
  ON pastoral_journal_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pastoral_journals pj
      JOIN memberships m ON m.tenant_id = pj.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
      WHERE pj.id = pastoral_journal_comments.pastoral_journal_id
        AND (
          m.role IN ('pastor', 'admin')
          OR (m.role = 'zone_leader' AND EXISTS (
            SELECT 1 FROM small_groups sg
            JOIN zones z ON sg.zone_id = z.id
            WHERE sg.id = pj.small_group_id AND z.zone_leader_id = m.id
          ))
          OR (m.role = 'small_group_leader' AND EXISTS (
            SELECT 1 FROM small_groups sg
            WHERE sg.id = pj.small_group_id AND (sg.leader_id = m.id OR sg.co_leader_id = m.id)
          ))
          OR pj.author_id = m.id
        )
    )
  );

-- Zone leaders and pastors can create comments
CREATE POLICY "Leaders can create pastoral journal comments"
  ON pastoral_journal_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.id = author_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('zone_leader', 'pastor', 'admin')
    )
  );

-- Authors can update their own comments
CREATE POLICY "Authors can update own pastoral journal comments"
  ON pastoral_journal_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.id = author_id AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.id = author_id AND m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES: Notification Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Notifications Policies
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Device Tokens Policies
-- ----------------------------------------------------------------------------

-- Users can view their own device tokens within their tenant memberships
CREATE POLICY "Users can view own device tokens"
  ON device_tokens FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = device_tokens.tenant_id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'active'
    )
  );

-- Users can insert their own device tokens for active tenant memberships
CREATE POLICY "Users can insert device tokens"
  ON device_tokens FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = device_tokens.tenant_id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'active'
    )
  );

-- Users can update their own device tokens within their tenant memberships
CREATE POLICY "Users can update own device tokens"
  ON device_tokens FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = device_tokens.tenant_id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'active'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = device_tokens.tenant_id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'active'
    )
  );

-- Users can delete their own device tokens within their tenant memberships
CREATE POLICY "Users can delete own device tokens"
  ON device_tokens FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = device_tokens.tenant_id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'active'
    )
  );

-- ============================================================================
-- POLICIES: Attachment Table
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Attachments Policies
-- ----------------------------------------------------------------------------

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
            SELECT 1 FROM messages msg
            JOIN conversations c ON c.id = msg.conversation_id
            WHERE msg.id = attachments.message_id
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
              AND msg.deleted_at IS NULL
          ))
          -- Prayer card attachments: can view the parent prayer card
          OR (attachments.prayer_card_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM prayer_cards pc
            WHERE pc.id = attachments.prayer_card_id
              AND (
                pc.author_id = m.id
                OR pc.recipient_scope = 'church_wide'
                OR (pc.recipient_scope = 'individual' AND EXISTS (
                  SELECT 1 FROM prayer_card_recipients pcr
                  WHERE pcr.prayer_card_id = pc.id AND pcr.recipient_membership_id = m.id
                ))
                OR (pc.recipient_scope = 'small_group' AND EXISTS (
                  SELECT 1 FROM prayer_card_recipients pcr
                  WHERE pcr.prayer_card_id = pc.id AND pcr.recipient_small_group_id = m.small_group_id
                ))
              )
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

-- ============================================================================
-- End of RLS Policies Migration
-- ============================================================================
