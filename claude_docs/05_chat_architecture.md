---
tags: [architecture, chat, messaging, event-chat, threads]
---

# 05 Chat Architecture

## WHAT
Message model, conversations/threads, delivery expectations, and special modes (Event Chat).

## WHY
- Chat is core UX; needs predictable model + tests.
- Event Chat introduces message-level visibility rules (high risk for tenant/role leakage).

## HOW

### Conversation/Thread Model

#### Conversation Types
- **Direct**: 1:1 messaging between two users
- **Small Group**: Cell group chat (background color variant)
- **Ministry**: Ministry team chat (background color variant)
- **Church Wide**: All-church announcements/discussions

#### Thread Support
- Messages can have a `thread_id` pointing to parent message
- Thread view functions like regular chat
- Threads cannot create nested threads (single level only)
- Clicking thread indicator opens thread view

### Message Schema Fields

```sql
messages:
  id: uuid (PK)
  tenant_id: uuid (required, FK -> tenants)
  conversation_id: uuid (FK -> conversations)
  sender_id: uuid (FK -> auth.users)
  content: text
  content_type: text  -- 'text', 'image', 'prayer_card', 'system'
  created_at: timestamptz
  updated_at: timestamptz
  deleted_at: timestamptz (soft delete)
  thread_id: uuid (nullable, parent message for threads)
  event_chat_excluded_users: uuid[] (nullable)
  metadata: jsonb
```

### Event Chat: Selective Visibility

#### Feature Requirements
Messages can be sent in group chat while excluding specific members from seeing them. Use case: planning surprise events without the subject knowing.

**Core capabilities:**
- Sender can select 1-5 users to exclude from seeing the message
- Excluded users never see the message in any view (list, detail, search, notifications)
- Only sender sees visual indicator (eye emoji 👁️ already implemented in MessageBubble)
- Exclusions are immutable once message is sent

#### Enforcement Points

1. **Database Level (RLS)**
```sql
-- Messages table uses is_event_chat boolean flag
-- event_chat_exclusions table stores exclusion relationships

-- RLS policy on messages filters via event_chat_exclusions
CREATE POLICY event_chat_visibility ON messages
  FOR SELECT
  USING (
    tenant_id = auth.jwt() ->> 'tenant_id'
    AND NOT EXISTS (
      SELECT 1 FROM event_chat_exclusions
      WHERE event_chat_exclusions.message_id = messages.id
        AND event_chat_exclusions.excluded_membership_id = auth.jwt() ->> 'membership_id'
    )
  );
```

2. **API Level**
- Validate excluded users are members of the conversation
- Cannot exclude yourself
- Maximum 5 excluded users per message
- Validation enforced at both client and database levels

3. **Client Level**
- UI indicator for Event Chat messages (sender only - eye emoji 👁️)
- Excluded users never receive the message in any view
- MessageInput component provides Event Chat mode toggle

#### Validation Rules

| Rule | Description | Enforcement Level |
|------|-------------|-------------------|
| **Cannot exclude self** | Sender cannot be in exclusion list | Client + Database |
| **Max 5 exclusions** | Cannot select more than 5 users per message | Client + Database |
| **Must be member** | Excluded users must be active conversation participants | Client + Database |
| **Immutable** | Once sent, exclusions cannot be modified | Database (no UPDATE) |

#### UI Flow

1. **User taps "Event Chat" button** (👁️ icon) in message input area
2. **Modal/sheet opens** showing list of conversation participants
3. **User selects 1-5 members** to exclude (multi-select with checkboxes)
4. **Selected count displayed** (e.g., "2 of 5 selected")
5. **"Send Event Chat" button** replaces normal "Send" button
6. **After sending**, input returns to normal mode

**Visual states:**
- **Normal mode**: Standard message input with send button
- **Event Chat mode**: Badge showing excluded count, "Send Event Chat" button
- **Selector modal**: Participant list with checkboxes, disabled after 5 selections

#### API Contract

```typescript
// Message insert with Event Chat
{
  tenant_id: uuid,
  conversation_id: uuid,
  sender_id: uuid,
  content: string,
  content_type: 'text',
  is_event_chat: true  // Set to true for Event Chat
}

// Separate insert for exclusions (after message created)
event_chat_exclusions: [
  { message_id: uuid, excluded_membership_id: uuid },
  ...
]
```

**Schema notes:**
- `messages.is_event_chat`: boolean flag indicating Event Chat message
- `event_chat_exclusions` table: stores (message_id, excluded_membership_id) pairs
- RLS policy on `event_chat_exclusions`: only sender can query
- RLS policy on `messages`: filters out messages where user is excluded

#### Test Scenarios

**Integration Tests:**
- RLS policy blocks excluded user from seeing message
- RLS policy allows non-excluded users to see message
- Sender can always see their own Event Chat message
- Cross-tenant isolation (User A tenant cannot see User B tenant Event Chat)
- `event_chat_exclusions` table only readable by message sender

**E2E Tests:**
- User A sends Event Chat excluding User B
- User B logs in and cannot see the message
- User C (not excluded) logs in and sees the message
- Sender sees eye emoji indicator on their message
- Excluded user count validation (max 5)
- Cannot exclude self validation
- Event Chat mode toggle in MessageInput

### Room Type Visual Differentiation
- Background color varies by conversation type
- Limited color palette for visual clarity:
  - Direct: Default/neutral
  - Small Group: Warm tone
  - Ministry: Cool tone
  - Church Wide: Distinct accent

### Read Receipts / Typing Indicators
- Read receipts: Track last read message per user per conversation
- Typing indicators: Real-time via Supabase subscriptions
- Both respect Event Chat exclusions

### Test Implications

#### Unit Tests
- Visibility filtering helpers correctly filter excluded users
- Message schema validation
- Thread relationship logic

#### Integration Tests
- RLS policy enforcement for Event Chat
- API validation for excluded users
- Real-time subscription filters

#### E2E Tests
- Event Chat scenario: excluded user cannot see message
- Thread creation and navigation
- Tenant isolation in chat (User A tenant cannot see User B tenant messages)
- Room type background colors render correctly

---

## Implementation Guidance

### Chat List Screen Requirements

#### Query Pattern
```typescript
// Fetch conversations with last message and unread count
const { data: conversations } = await supabase
  .from('conversations')
  .select(`
    id,
    tenant_id,
    type,
    name,
    small_group_id,
    ministry_id,
    created_at,
    updated_at,
    messages (
      id,
      content,
      content_type,
      created_at,
      sender:memberships (
        id,
        user:users (
          id,
          display_name,
          photo_url
        )
      )
    ),
    conversation_participants!inner (
      membership_id,
      last_read_at
    )
  `)
  .eq('tenant_id', tenantId)
  .order('updated_at', { ascending: false });
```

#### Sorting Logic
- Sort by `updated_at DESC` (most recent activity first)
- `updated_at` is updated when new messages are sent

#### Conversation Type Filtering
- Filter by `type` column when needed
- Options: `direct`, `small_group`, `ministry`, `church_wide`

#### Empty State Handling
- Display empty state message using i18n key `chat.no_conversations`
- Show call-to-action to start a new conversation

#### Unread Count Calculation
```typescript
// Count messages created after last_read_at for the participant
const unreadCount = messages.filter(
  (m) => new Date(m.created_at) > new Date(participant.last_read_at)
).length;
```

### Chat Detail Screen Requirements

#### Message Pagination Strategy
- Initial load: 50 most recent messages
- Infinite scroll for older messages (load 50 more on scroll to top)
- Messages ordered by `created_at ASC` for chronological display

#### Real-Time Subscription Setup
```typescript
const channel = supabase
  .channel(`messages:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => onNewMessage(payload.new as Message)
  )
  .subscribe();

// Cleanup on unmount
return () => {
  supabase.removeChannel(channel);
};
```

#### Message Rendering by Content Type
| Content Type | Rendering |
|--------------|-----------|
| `text` | Standard text bubble with markdown support |
| `image` | Image preview with tap to expand |
| `system` | Centered, muted text (e.g., "User joined") |
| `prayer_card` | Special card component with prayer styling |

#### Thread Indicator UI
- Show reply count badge on messages with replies
- Display "N replies" text using i18n key `chat.replies`
- Tap to navigate to thread view

#### Message Input Component
- Text input with placeholder (i18n: `chat.type_message`)
- Send button (i18n: `chat.send`)
- Disable send when input empty or sending in progress
- Clear input after successful send

### Room Type Background Color Mapping

| Conversation Type | Theme Token | Color (Light) | Color (Dark) |
|-------------------|-------------|---------------|--------------|
| `direct` | `$background` | Default | Default |
| `small_group` | `$backgroundWarm` | `#FFF8F0` | `#2A2520` |
| `ministry` | `$backgroundCool` | `#F0F8FF` | `#1A2530` |
| `church_wide` | `$backgroundAccent` | `#FFF0F8` | `#2A1A25` |

### Real-Time Subscription Patterns

#### Subscription Setup
```typescript
// Subscribe to messages table filtered by conversation_id
const subscription = supabase
  .channel(`room:${conversationId}`)
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
    handleInsert
  )
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
    handleUpdate
  )
  .on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
    handleDelete
  )
  .subscribe();
```

#### Event Handlers
- **INSERT**: Append new message to list, auto-scroll to bottom
- **UPDATE**: Update message in place (for edits)
- **DELETE**: Remove message or show "deleted" placeholder

#### Cleanup on Unmount
```typescript
useEffect(() => {
  const channel = supabase.channel(...);
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [conversationId]);
```

#### Error Handling
- Reconnect automatically on disconnect
- Show toast notification on connection errors
- Queue messages locally if offline, sync when reconnected

### Test Implications (Detailed)

#### Unit Tests
- **Message component rendering**: Test all content types render correctly
- **Date formatting**: Test relative time display (Today, Yesterday, date)
- **Unread count calculation**: Test with various last_read_at scenarios
- **Room background color**: Test mapping function for all conversation types

#### Integration Tests
- **Real-time subscription behavior**: Mock Supabase channel, verify callbacks
- **Message query with RLS**: Verify tenant_id is enforced
- **Event Chat exclusion**: Verify excluded users don't receive messages
- **Pagination**: Test loadMore function loads correct offset

#### E2E Tests (Detox)
1. **View conversation list**
   - Login and select tenant
   - Navigate to chat tab
   - Assert conversation list visible
   - Assert last message preview shown
   - Assert unread count badge visible

2. **Open conversation and view messages**
   - Tap on conversation
   - Assert chat detail screen opens
   - Assert messages in chronological order
   - Assert sender names visible

3. **Send text message**
   - Open conversation
   - Type in input field
   - Tap send button
   - Assert message appears
   - Assert input cleared

4. **Receive real-time message**
   - Open conversation
   - Simulate another user sending message
   - Assert new message appears without refresh

5. **Room type background colors**
   - Open small group conversation
   - Assert background matches warm theme
   - Navigate back, open ministry conversation
   - Assert background matches cool theme

### Figma References
- Chat List: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=2-780
- Chat Detail: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=2-776
- Event Chat: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=202-1163
