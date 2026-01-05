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

#### Feature Description
Messages can be sent in group chat while excluding specific members from seeing them. Use case: planning surprise events without the subject knowing.

#### Enforcement Points

1. **Database Level (RLS)**
```sql
CREATE POLICY event_chat_visibility ON messages
  USING (
    tenant_id = auth.jwt() ->> 'tenant_id'
    AND (
      event_chat_excluded_users IS NULL
      OR NOT (auth.uid() = ANY(event_chat_excluded_users))
    )
  );
```

2. **API Level**
- Validate excluded users are members of the conversation
- Cannot exclude yourself
- Maximum exclusion limit (e.g., 5 users)

3. **Client Level**
- UI indicator for Event Chat messages (sender only)
- Excluded users never receive the message in any view

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
