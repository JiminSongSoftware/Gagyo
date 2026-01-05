# Domain Glossary

This document defines the complete domain ontology for Gagyo, a multi-tenant church communication platform. Every entity follows a structured definition format to ensure clarity and consistency across the codebase.

---

## Entity Definition Format

Each entity is defined with the following structure:

- **Type**: Entity | Value Object | Aggregate Root | Domain Event
- **Identity Rules**: How uniqueness is determined
- **Lifecycle**: Creation → Mutation → Deletion/Archival states
- **Invariants**: Conditions that must always hold
- **Relationships**: Parent/child/references with cardinality
- **Tenant Scope**: Global | Tenant | User
- **Persistence**: Source of truth table and storage boundaries
- **Events Emitted**: Domain events triggered by state changes

---

## Core Entities

### Tenant

The root organizational unit representing a single church or ministry organization.

| Property | Definition |
|----------|------------|
| **Type** | Aggregate Root |
| **Identity Rules** | UUID primary key; unique `slug` for URL-friendly identification |
| **Lifecycle** | Created by super-admin → Active → Suspended → Archived |
| **Invariants** | Must have at least one admin member; slug must be unique across all tenants; name cannot be empty |
| **Relationships** | Has many: Memberships (1:N), Conversations (1:N), SmallGroups (1:N), Zones (1:N), Ministries (1:N), PrayerCards (1:N), PastoralJournals (1:N) |
| **Tenant Scope** | Global (tenant is the boundary itself) |
| **Persistence** | `tenants` table |
| **Events Emitted** | `TenantCreated`, `TenantSuspended`, `TenantArchived` |

**Fields**:
- `id`: UUID (primary key)
- `name`: string (display name)
- `slug`: string (URL-safe identifier, unique)
- `settings`: JSONB (tenant-specific configuration)
- `created_at`: timestamp
- `updated_at`: timestamp

---

### User

A person who can authenticate and interact with the system. Users exist globally but access tenants through memberships.

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | UUID primary key; unique auth provider ID (Supabase Auth UID) |
| **Lifecycle** | Created on first auth → Active → Deactivated |
| **Invariants** | Must have valid auth provider ID; email must be valid format if provided |
| **Relationships** | Has many: Memberships (1:N), DeviceTokens (1:N), Notifications (1:N) |
| **Tenant Scope** | Global (user exists outside tenant boundary, accesses via membership) |
| **Persistence** | `users` table (extends Supabase auth.users) |
| **Events Emitted** | `UserCreated`, `UserDeactivated`, `UserProfileUpdated` |

**Fields**:
- `id`: UUID (primary key, matches auth.users.id)
- `display_name`: string (nullable, user-chosen display name)
- `photo_url`: string (nullable, profile photo URL)
- `locale`: Locale value object (default: 'en')
- `created_at`: timestamp
- `updated_at`: timestamp

---

### Membership

The relationship between a User and a Tenant, defining what role the user has within that tenant.

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | Composite key: (user_id, tenant_id); a user can have only one membership per tenant |
| **Lifecycle** | Invited → Active → Suspended → Removed |
| **Invariants** | User and Tenant must exist; role must be valid Role value; tenant must have at least one admin |
| **Relationships** | Belongs to: User (N:1), Tenant (N:1); Optionally belongs to: SmallGroup (N:1) |
| **Tenant Scope** | Tenant |
| **Persistence** | `memberships` table |
| **Events Emitted** | `UserJoinedTenant`, `MembershipRoleChanged`, `UserLeftTenant` |

**Fields**:
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to users)
- `tenant_id`: UUID (foreign key to tenants)
- `role`: Role value object
- `small_group_id`: UUID (nullable, foreign key to small_groups)
- `status`: enum ('invited', 'active', 'suspended', 'removed')
- `created_at`: timestamp
- `updated_at`: timestamp

---

### SmallGroup

A cell group or small group within a church, used for organizing members and pastoral care.

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | UUID primary key; unique name within tenant |
| **Lifecycle** | Created → Active → Archived |
| **Invariants** | Must belong to exactly one tenant; must have a leader assigned; name must be unique within tenant |
| **Relationships** | Belongs to: Tenant (N:1), Zone (N:1, optional); Has one: Leader (Membership), CoLeader (Membership, optional); Has many: Members via Membership (1:N), PastoralJournals (1:N) |
| **Tenant Scope** | Tenant |
| **Persistence** | `small_groups` table |
| **Events Emitted** | `SmallGroupCreated`, `SmallGroupLeaderChanged`, `SmallGroupArchived` |

**Fields**:
- `id`: UUID (primary key)
- `tenant_id`: UUID (foreign key to tenants)
- `zone_id`: UUID (nullable, foreign key to zones)
- `name`: string
- `leader_id`: UUID (foreign key to memberships)
- `co_leader_id`: UUID (nullable, foreign key to memberships)
- `created_at`: timestamp
- `updated_at`: timestamp

---

### Zone

An organizational unit grouping multiple small groups, typically led by a zone leader.

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | UUID primary key; unique name within tenant |
| **Lifecycle** | Created → Active → Archived |
| **Invariants** | Must belong to exactly one tenant; name must be unique within tenant |
| **Relationships** | Belongs to: Tenant (N:1); Has one: ZoneLeader (Membership, optional); Has many: SmallGroups (1:N) |
| **Tenant Scope** | Tenant |
| **Persistence** | `zones` table |
| **Events Emitted** | `ZoneCreated`, `ZoneLeaderAssigned`, `ZoneArchived` |

**Fields**:
- `id`: UUID (primary key)
- `tenant_id`: UUID (foreign key to tenants)
- `name`: string
- `zone_leader_id`: UUID (nullable, foreign key to memberships)
- `created_at`: timestamp
- `updated_at`: timestamp

---

### Ministry

A ministry team or department within a church (e.g., worship team, youth ministry).

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | UUID primary key; unique name within tenant |
| **Lifecycle** | Created → Active → Archived |
| **Invariants** | Must belong to exactly one tenant; name must be unique within tenant |
| **Relationships** | Belongs to: Tenant (N:1); Has many: MinistryMemberships (1:N), Conversations (1:N) |
| **Tenant Scope** | Tenant |
| **Persistence** | `ministries` table |
| **Events Emitted** | `MinistryCreated`, `MinistryArchived` |

**Fields**:
- `id`: UUID (primary key)
- `tenant_id`: UUID (foreign key to tenants)
- `name`: string
- `description`: text (nullable)
- `created_at`: timestamp
- `updated_at`: timestamp

---

### MinistryMembership

The relationship between a User and a Ministry.

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | Composite key: (membership_id, ministry_id) |
| **Lifecycle** | Created → Active → Removed |
| **Invariants** | Membership and Ministry must exist and belong to same tenant |
| **Relationships** | Belongs to: Membership (N:1), Ministry (N:1) |
| **Tenant Scope** | Tenant |
| **Persistence** | `ministry_memberships` table |
| **Events Emitted** | `UserJoinedMinistry`, `UserLeftMinistry` |

**Fields**:
- `id`: UUID (primary key)
- `membership_id`: UUID (foreign key to memberships)
- `ministry_id`: UUID (foreign key to ministries)
- `created_at`: timestamp

---

## Communication Entities

### Conversation

A chat channel that can be between individuals, small groups, ministries, or church-wide.

| Property | Definition |
|----------|------------|
| **Type** | Aggregate Root |
| **Identity Rules** | UUID primary key |
| **Lifecycle** | Created → Active → Archived |
| **Invariants** | Must belong to exactly one tenant; type must be valid ConversationType; participants defined by type rules |
| **Relationships** | Belongs to: Tenant (N:1); Has many: Messages (1:N), ConversationParticipants (1:N) |
| **Tenant Scope** | Tenant |
| **Persistence** | `conversations` table |
| **Events Emitted** | `ConversationCreated`, `ConversationArchived` |

**Fields**:
- `id`: UUID (primary key)
- `tenant_id`: UUID (foreign key to tenants)
- `type`: ConversationType value object
- `name`: string (nullable, for group/ministry conversations)
- `small_group_id`: UUID (nullable, for small_group type)
- `ministry_id`: UUID (nullable, for ministry type)
- `created_at`: timestamp
- `updated_at`: timestamp

---

### ConversationParticipant

Tracks who can participate in a conversation (for direct messages and custom groups).

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | Composite key: (conversation_id, membership_id) |
| **Lifecycle** | Added → Active → Removed |
| **Invariants** | Conversation and Membership must exist and belong to same tenant |
| **Relationships** | Belongs to: Conversation (N:1), Membership (N:1) |
| **Tenant Scope** | Tenant |
| **Persistence** | `conversation_participants` table |
| **Events Emitted** | `ParticipantAdded`, `ParticipantRemoved` |

**Fields**:
- `id`: UUID (primary key)
- `conversation_id`: UUID (foreign key to conversations)
- `membership_id`: UUID (foreign key to memberships)
- `last_read_at`: timestamp (nullable, for read receipts)
- `created_at`: timestamp

---

### Message

A single message within a conversation.

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | UUID primary key; unique within conversation by (conversation_id, created_at, sender_id) |
| **Lifecycle** | Created → Delivered → Read → (optionally) Deleted |
| **Invariants** | Must belong to exactly one conversation and tenant; sender must be valid participant; content or attachment required |
| **Relationships** | Belongs to: Conversation (N:1), Sender/Membership (N:1), ParentMessage (N:1, optional, for thread replies); Has many: Attachments (1:N), EventChatExclusions (1:N), ThreadReplies (1:N, messages with this as parent_id) |
| **Tenant Scope** | Tenant |
| **Persistence** | `messages` table |
| **Events Emitted** | `MessageSent`, `MessageDeleted` |

**Fields**:
- `id`: UUID (primary key)
- `tenant_id`: UUID (foreign key to tenants)
- `conversation_id`: UUID (foreign key to conversations)
- `sender_id`: UUID (foreign key to memberships)
- `parent_id`: UUID (nullable, for single-level threading - null for top-level, set for thread replies)
- `reply_count`: integer (computed, count of direct thread replies - aggregate subquery)
- `content`: text (nullable)
- `content_type`: MessageContentType value object
- `is_event_chat`: boolean (default false, enables exclusion feature)
- `created_at`: timestamp
- `updated_at`: timestamp
- `deleted_at`: timestamp (nullable, soft delete)

---

### EventChatExclusion

Tracks which users are excluded from seeing a specific Event Chat message.

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | Composite key: (message_id, excluded_membership_id) |
| **Lifecycle** | Created (immutable) |
| **Invariants** | Message must have is_event_chat=true; excluded membership must be in same tenant |
| **Relationships** | Belongs to: Message (N:1), ExcludedMembership (N:1) |
| **Tenant Scope** | Tenant |
| **Persistence** | `event_chat_exclusions` table |
| **Events Emitted** | None |

**Fields**:
- `id`: UUID (primary key)
- `message_id`: UUID (foreign key to messages)
- `excluded_membership_id`: UUID (foreign key to memberships)
- `created_at`: timestamp

---

### Thread

A single-level nested conversation within a parent message. Threads allow focused discussion without cluttering the main conversation.

| Property | Definition |
|----------|------------|
| **Type** | Value Object (realized through Message.parent_id) |
| **Identity Rules** | Identified by parent message ID; all replies share the same parent_id |
| **Lifecycle** | Created when first reply sent → Active → (optionally) Deleted |
| **Invariants** | Thread depth must be exactly 1 (replies cannot have replies); parent message cannot itself be a reply; parent message must exist in same conversation and tenant |
| **Relationships** | Parent Message (N:1, the message being replied to); Thread Replies (1:N, messages with this message as parent_id) |
| **Tenant Scope** | Tenant |
| **Persistence** | Realized via `messages.parent_id`; `reply_count` computed via aggregate subquery |
| **Events Emitted** | `ThreadReplyCreated` (alias of MessageSent for thread replies) |

**Fields** (via Message):
- `parent_id`: UUID (nullable, foreign key to messages.self - null for top-level messages, set for thread replies)
- `reply_count`: integer (computed, number of direct replies to this message)

**Thread Reply Invariants**:
- A message with `parent_id` set is a thread reply
- Thread replies themselves cannot have `parent_id` (no nested threads)
- Deleting a parent message cascades to all its thread replies
- Thread replies respect the same tenant and conversation boundaries as their parent

---

### ReplyCount

The aggregate count of direct replies to a message within a thread.

| Property | Definition |
|----------|------------|
| **Type** | Value Object (computed) |
| **Identity Rules** | Composite: (message_id) → count |
| **Lifecycle** | Recomputed on each query |
| **Invariants** | Always non-negative; increments on new reply; decrements on reply deletion |
| **Relationships** | References: Message (N:1) |
| **Tenant Scope** | Tenant |
| **Persistence** | Computed via Supabase aggregate subquery in SELECT clause |
| **Events Emitted** | None (derived state) |

**Query Pattern**:
```sql
SELECT m.*,
  (SELECT COUNT(*) FROM messages WHERE parent_id = m.id) AS reply_count
FROM messages m
```

---

## Prayer Entities

### PrayerCard

A prayer request that can be shared with individuals, groups, or the entire church.

| Property | Definition |
|----------|------------|
| **Type** | Aggregate Root |
| **Identity Rules** | UUID primary key |
| **Lifecycle** | Created → Active → Answered → Archived |
| **Invariants** | Must belong to exactly one tenant and author; recipient scope must be valid; answered_at only set when answered=true |
| **Relationships** | Belongs to: Tenant (N:1), Author/Membership (N:1); Has many: PrayerCardRecipients (1:N), Attachments (1:N) |
| **Tenant Scope** | Tenant |
| **Persistence** | `prayer_cards` table |
| **Events Emitted** | `PrayerCardCreated`, `PrayerAnswered`, `PrayerCardArchived` |

**Fields**:
- `id`: UUID (primary key)
- `tenant_id`: UUID (foreign key to tenants)
- `author_id`: UUID (foreign key to memberships)
- `content`: text
- `recipient_scope`: enum ('individual', 'small_group', 'church_wide')
- `answered`: boolean (default false)
- `answered_at`: timestamp (nullable)
- `created_at`: timestamp
- `updated_at`: timestamp

---

### PrayerCardRecipient

Defines who can see a specific prayer card (for individual and small_group scopes).

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | Composite key: (prayer_card_id, recipient_membership_id or recipient_small_group_id) |
| **Lifecycle** | Created (immutable) |
| **Invariants** | Either recipient_membership_id or recipient_small_group_id must be set, not both |
| **Relationships** | Belongs to: PrayerCard (N:1), RecipientMembership (N:1, optional), RecipientSmallGroup (N:1, optional) |
| **Tenant Scope** | Tenant |
| **Persistence** | `prayer_card_recipients` table |
| **Events Emitted** | None |

**Fields**:
- `id`: UUID (primary key)
- `prayer_card_id`: UUID (foreign key to prayer_cards)
- `recipient_membership_id`: UUID (nullable, foreign key to memberships)
- `recipient_small_group_id`: UUID (nullable, foreign key to small_groups)
- `created_at`: timestamp

---

### PrayerAnalytics

Aggregated statistics for prayer cards at various levels.

| Property | Definition |
|----------|------------|
| **Type** | Value Object (computed/materialized) |
| **Identity Rules** | Composite key: (tenant_id, scope, scope_id, period) |
| **Lifecycle** | Computed on demand or materialized periodically |
| **Invariants** | All counts must be non-negative |
| **Relationships** | References: Tenant, optionally SmallGroup or Membership |
| **Tenant Scope** | Tenant |
| **Persistence** | Materialized view or computed via query |
| **Events Emitted** | None |

**Computed Fields**:
- `total_prayers`: integer
- `answered_prayers`: integer
- `prayer_answer_rate`: decimal
- `period_start`: date
- `period_end`: date

---

## Pastoral Care Entities

### PastoralJournal

A weekly pastoral report from small group leaders to zone leaders and pastors.

| Property | Definition |
|----------|------------|
| **Type** | Aggregate Root |
| **Identity Rules** | UUID primary key; unique by (small_group_id, week_start_date) |
| **Lifecycle** | Draft → Submitted → ZoneReviewed → PastorConfirmed |
| **Invariants** | Must belong to exactly one small group and tenant; status transitions must follow workflow; author must be small group leader or co-leader |
| **Relationships** | Belongs to: Tenant (N:1), SmallGroup (N:1), Author/Membership (N:1); Has many: PastoralJournalComments (1:N) |
| **Tenant Scope** | Tenant |
| **Persistence** | `pastoral_journals` table |
| **Events Emitted** | `PastoralJournalSubmitted`, `PastoralJournalForwarded`, `PastoralJournalConfirmed` |

**Fields**:
- `id`: UUID (primary key)
- `tenant_id`: UUID (foreign key to tenants)
- `small_group_id`: UUID (foreign key to small_groups)
- `author_id`: UUID (foreign key to memberships)
- `week_start_date`: date
- `content`: text
- `status`: PastoralJournalStatus value object
- `created_at`: timestamp
- `updated_at`: timestamp

---

### PastoralJournalComment

Comments on a pastoral journal from zone leaders or pastors.

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | UUID primary key |
| **Lifecycle** | Created → (optionally) Edited |
| **Invariants** | Author must be zone leader or pastor role; journal must exist |
| **Relationships** | Belongs to: PastoralJournal (N:1), Author/Membership (N:1) |
| **Tenant Scope** | Tenant |
| **Persistence** | `pastoral_journal_comments` table |
| **Events Emitted** | `PastoralJournalCommentAdded` |

**Fields**:
- `id`: UUID (primary key)
- `pastoral_journal_id`: UUID (foreign key to pastoral_journals)
- `author_id`: UUID (foreign key to memberships)
- `content`: text
- `created_at`: timestamp
- `updated_at`: timestamp

---

## Notification Entities

### Notification

A notification sent to a user about an event in the system.

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | UUID primary key |
| **Lifecycle** | Created → Delivered → Read → Archived |
| **Invariants** | Must belong to a valid user and tenant; type must be valid NotificationType |
| **Relationships** | Belongs to: User (N:1), Tenant (N:1) |
| **Tenant Scope** | Tenant |
| **Persistence** | `notifications` table |
| **Events Emitted** | `NotificationCreated`, `NotificationRead` |

**Fields**:
- `id`: UUID (primary key)
- `tenant_id`: UUID (foreign key to tenants)
- `user_id`: UUID (foreign key to users)
- `type`: NotificationType value object
- `title`: string
- `body`: text
- `payload`: JSONB (deep link data, entity references)
- `read`: boolean (default false)
- `read_at`: timestamp (nullable)
- `created_at`: timestamp

---

### DeviceToken

A push notification token for a user's device.

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | Composite key: (user_id, token); token must be unique |
| **Lifecycle** | Registered → Active → Expired/Revoked |
| **Invariants** | Token must be valid Expo push token format; user must exist |
| **Relationships** | Belongs to: User (N:1) |
| **Tenant Scope** | Global (device tokens are user-level, not tenant-specific) |
| **Persistence** | `device_tokens` table |
| **Events Emitted** | `DeviceTokenRegistered`, `DeviceTokenRevoked` |

**Fields**:
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to users)
- `token`: string (Expo push token)
- `platform`: enum ('ios', 'android')
- `last_used_at`: timestamp
- `created_at`: timestamp
- `revoked_at`: timestamp (nullable)

---

## Attachment Entity

### Attachment

A file or image attached to a message or prayer card.

| Property | Definition |
|----------|------------|
| **Type** | Entity |
| **Identity Rules** | UUID primary key |
| **Lifecycle** | Uploaded → Active → Deleted |
| **Invariants** | Must belong to exactly one parent (message OR prayer_card); URL must be valid; type must be valid |
| **Relationships** | Belongs to: Tenant (N:1), Message (N:1, optional), PrayerCard (N:1, optional) |
| **Tenant Scope** | Tenant |
| **Persistence** | `attachments` table; files stored in Supabase Storage |
| **Events Emitted** | `AttachmentUploaded`, `AttachmentDeleted` |

**Fields**:
- `id`: UUID (primary key)
- `tenant_id`: UUID (foreign key to tenants)
- `message_id`: UUID (nullable, foreign key to messages)
- `prayer_card_id`: UUID (nullable, foreign key to prayer_cards)
- `url`: string (storage URL)
- `file_name`: string
- `file_type`: string (MIME type)
- `file_size`: integer (bytes)
- `created_at`: timestamp

---

## Value Objects

### Locale

User's preferred language for the UI.

| Property | Definition |
|----------|------------|
| **Type** | Value Object |
| **Values** | `'en'` (English), `'ko'` (Korean) |
| **Default** | `'en'` |
| **Validation** | Must be one of the defined values |

---

### Role

A user's role within a tenant, determining their permissions.

| Property | Definition |
|----------|------------|
| **Type** | Value Object (Enumeration) |
| **Values** | `'member'`, `'small_group_leader'`, `'zone_leader'`, `'pastor'`, `'admin'` |
| **Hierarchy** | admin > pastor > zone_leader > small_group_leader > member |
| **Validation** | Must be one of the defined values |

**Permission Matrix**:
| Role | View All Journals | Comment on Journals | Manage Small Groups | Manage Zones | Manage Tenant |
|------|-------------------|---------------------|---------------------|--------------|---------------|
| member | No | No | No | No | No |
| small_group_leader | Own group only | No | No | No | No |
| zone_leader | Zone groups | Yes (forward) | No | No | No |
| pastor | All | Yes (confirm) | No | No | No |
| admin | All | Yes | Yes | Yes | Yes |

---

### ConversationType

The type of conversation, determining participant rules.

| Property | Definition |
|----------|------------|
| **Type** | Value Object (Enumeration) |
| **Values** | `'direct'`, `'small_group'`, `'ministry'`, `'church_wide'` |
| **Validation** | Must be one of the defined values |

**Participant Rules**:
- `direct`: Exactly 2 members, defined via ConversationParticipant
- `small_group`: All members of the referenced small_group_id
- `ministry`: All members of the referenced ministry_id
- `church_wide`: All members of the tenant

---

### MessageContentType

The type of content in a message.

| Property | Definition |
|----------|------------|
| **Type** | Value Object (Enumeration) |
| **Values** | `'text'`, `'image'`, `'prayer_card'`, `'system'` |
| **Validation** | Must be one of the defined values |

---

### NotificationType

The type of notification being sent.

| Property | Definition |
|----------|------------|
| **Type** | Value Object (Enumeration) |
| **Values** | `'new_message'`, `'mention'`, `'prayer_answered'`, `'pastoral_journal_submitted'`, `'pastoral_journal_forwarded'`, `'pastoral_journal_confirmed'`, `'system'` |
| **Validation** | Must be one of the defined values |

---

### PastoralJournalStatus

The workflow status of a pastoral journal.

| Property | Definition |
|----------|------------|
| **Type** | Value Object (Enumeration) |
| **Values** | `'draft'`, `'submitted'`, `'zone_reviewed'`, `'pastor_confirmed'` |
| **Valid Transitions** | draft → submitted → zone_reviewed → pastor_confirmed |
| **Validation** | Transitions must follow defined workflow |

**Transition Rules**:
- `draft → submitted`: Author (leader) submits
- `submitted → zone_reviewed`: Zone leader forwards with optional comment
- `zone_reviewed → pastor_confirmed`: Pastor confirms with optional comment

---

## Domain Events

### MessageSent

Triggered when a new message is created in a conversation.

| Property | Definition |
|----------|------------|
| **Type** | Domain Event |
| **Trigger** | Message entity created |
| **Payload** | `{ tenant_id, conversation_id, message_id, sender_id, content_preview, is_event_chat }` |
| **Subscribers** | Push notification service, real-time broadcast service |

---

### PrayerAnswered

Triggered when a prayer card is marked as answered.

| Property | Definition |
|----------|------------|
| **Type** | Domain Event |
| **Trigger** | PrayerCard.answered set to true |
| **Payload** | `{ tenant_id, prayer_card_id, author_id, recipient_ids }` |
| **Subscribers** | Push notification service (celebratory notification to all recipients) |

---

### PastoralJournalSubmitted

Triggered when a small group leader submits their pastoral journal.

| Property | Definition |
|----------|------------|
| **Type** | Domain Event |
| **Trigger** | PastoralJournal.status changed from 'draft' to 'submitted' |
| **Payload** | `{ tenant_id, journal_id, small_group_id, zone_id, zone_leader_id }` |
| **Subscribers** | Push notification service (notify zone leader) |

---

### PastoralJournalForwarded

Triggered when a zone leader forwards a journal to the pastor.

| Property | Definition |
|----------|------------|
| **Type** | Domain Event |
| **Trigger** | PastoralJournal.status changed from 'submitted' to 'zone_reviewed' |
| **Payload** | `{ tenant_id, journal_id, zone_leader_id, pastor_ids }` |
| **Subscribers** | Push notification service (notify pastors) |

---

### PastoralJournalConfirmed

Triggered when a pastor confirms a pastoral journal.

| Property | Definition |
|----------|------------|
| **Type** | Domain Event |
| **Trigger** | PastoralJournal.status changed to 'pastor_confirmed' |
| **Payload** | `{ tenant_id, journal_id, pastor_id, author_id }` |
| **Subscribers** | Push notification service (notify original author) |

---

### UserJoinedTenant

Triggered when a user's membership in a tenant becomes active.

| Property | Definition |
|----------|------------|
| **Type** | Domain Event |
| **Trigger** | Membership.status changed to 'active' |
| **Payload** | `{ tenant_id, user_id, membership_id, role }` |
| **Subscribers** | Onboarding flow, default conversation subscriptions |

---

### TenantSwitched

Triggered when a user switches their active tenant context (client-side event).

| Property | Definition |
|----------|------------|
| **Type** | Domain Event (Client-side) |
| **Trigger** | User selects different tenant in UI |
| **Payload** | `{ user_id, previous_tenant_id, new_tenant_id }` |
| **Subscribers** | State management (refresh context), analytics |

---

## Aggregates Summary

### Tenant Aggregate
- **Root**: Tenant
- **Contains**: Memberships, Conversations, Messages, PrayerCards, PastoralJournals, SmallGroups, Zones, Ministries
- **Boundary**: All operations within a tenant are isolated; cross-tenant operations are prohibited

### Conversation Aggregate
- **Root**: Conversation
- **Contains**: Messages, ConversationParticipants, EventChatExclusions, Attachments (via messages)
- **Boundary**: Message operations are scoped to conversation; real-time subscriptions are per-conversation

### PrayerCard Aggregate
- **Root**: PrayerCard
- **Contains**: PrayerCardRecipients, Attachments
- **Boundary**: Visibility determined by recipient scope; analytics computed across aggregate

### PastoralJournal Aggregate
- **Root**: PastoralJournal
- **Contains**: PastoralJournalComments
- **Boundary**: Workflow state machine; access controlled by role hierarchy

---

## Entity Relationship Summary

```
Tenant (1) ──────────────────────────┬──► Memberships (N)
                                     │
                                     ├──► SmallGroups (N) ──► PastoralJournals (N)
                                     │         │
                                     │         └──► Zone (N:1)
                                     │
                                     ├──► Zones (N)
                                     │
                                     ├──► Ministries (N) ──► MinistryMemberships (N)
                                     │
                                     ├──► Conversations (N) ──► Messages (N)
                                     │                              │
                                     │                              └──► Attachments (N)
                                     │
                                     ├──► PrayerCards (N) ──► PrayerCardRecipients (N)
                                     │         │
                                     │         └──► Attachments (N)
                                     │
                                     └──► Notifications (N)

User (1) ──┬──► Memberships (N) ──► Tenant context
           │
           ├──► DeviceTokens (N)
           │
           └──► Notifications (N)
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-04 | Claude | Initial complete ontology with all entities, value objects, and domain events |
| 1.1 | 2024-01-05 | Claude | Added Thread and ReplyCount entities; updated Message entity with parent_id, reply_count, and ThreadReplies relationship; documented single-level threading invariants |
