---
tags: [architecture, chat, threads, messaging]
---

# 16 Thread Architecture

## WHAT

Single-level message threading that allows focused discussions on specific topics without cluttering the main conversation.

## WHY

- Users need to respond to specific messages without derailing the main chat flow
- Threads keep related discussions organized and discoverable
- Prevents context fragmentation in busy group conversations

## HOW

### Thread Model

Threads are implemented via the existing `messages.parent_id` column which references another message's `id`. This creates a single-level hierarchy where:

- **Top-level messages**: Messages with `parent_id = NULL`
- **Thread replies**: Messages with `parent_id` pointing to a top-level message

#### Database Schema (Existing)

```sql
messages:
  id: uuid (PK)
  tenant_id: uuid (required, FK -> tenants)
  conversation_id: uuid (FK -> conversations)
  sender_id: uuid (FK -> memberships)
  parent_id: uuid (nullable, FK -> messages) -- Thread parent reference
  content: text
  content_type: text  -- 'text', 'image', 'prayer_card', 'system'
  is_event_chat: boolean
  created_at: timestamptz
  updated_at: timestamptz
  deleted_at: timestamptz (soft delete)
```

#### Existing Infrastructure

- `parent_id` column with foreign key constraint
- Index on `parent_id` for efficient thread queries
- RLS policies automatically apply to thread messages

### Constraints

#### Single-Level Only (Non-Negotiable)

Threads cannot have nested threads. Before allowing a reply:

1. Fetch the target message
2. Verify `parent_id IS NULL`
3. If `parent_id` is not null, reject with error `chat.thread_cannot_nest`

```typescript
// Validation in useSendReply
const { data: parentMessage } = await supabase
  .from('messages')
  .select('parent_id')
  .eq('id', parentMessageId)
  .single();

if (parentMessage?.parent_id) {
  throw new Error(t('chat.thread_cannot_nest'));
}
```

#### Thread Messages Inherit Visibility

- Thread replies follow the same RLS policies as the parent message
- Event Chat exclusions on parent message apply to the entire thread
- Thread messages cannot override parent visibility rules

### Reply Count Calculation

The `reply_count` for each message is calculated via a Supabase aggregate subquery:

```typescript
.select(`
  id,
  tenant_id,
  conversation_id,
  sender_id,
  parent_id,
  content,
  content_type,
  is_event_chat,
  created_at,
  updated_at,
  deleted_at,
  sender:memberships!messages_sender_id_fkey (
    id,
    user:users!memberships_user_id_fkey (
      id,
      display_name,
      photo_url
    )
  ),
  replies:messages!parent_id(count)
`)
```

Transform response to include `reply_count`:

```typescript
const reply_count = msg.replies?.[0]?.count ?? 0;
```

### UI Behavior

#### Thread Indicator on Messages

Messages with `reply_count > 0` display a badge (already implemented in MessageBubble):

```
💬 3
```

Tapping anywhere on the message bubble opens the thread view.

#### Thread View Screen

Route: `/chat/thread/[id]` where `id` is the parent message ID.

Layout:

```
┌─────────────────────────────┐
│ Header: "Thread"      [X]   │
├─────────────────────────────┤
│ [Parent Message - Sticky]   │
├─────────────────────────────┤
│ Reply 1                     │
│ Reply 2                     │
│ Reply 3                     │
│ ...                         │
├─────────────────────────────┤
│ [Reply Input]               │
└─────────────────────────────┘
```

**Components:**
- Reuses `MessageList` component
- Reuses `MessageInput` component (without Event Chat mode)
- Reuses `MessageBubble` component (replies don't show thread indicator)
- Header shows "Thread" (i18n: `chat.thread_title`)

#### Thread Message Fetching

The `useThreadMessages` hook fetches messages where `parent_id = parentMessageId`:

```typescript
const { data } = await supabase
  .from('messages')
  .select(`
    id,
    tenant_id,
    conversation_id,
    sender_id,
    parent_id,
    content,
    content_type,
    is_event_chat,
    created_at,
    updated_at,
    deleted_at,
    sender:memberships!messages_sender_id_fkey (
      id,
      user:users!memberships_user_id_fkey (
        id,
        display_name,
        photo_url
      )
    )
  `)
  .eq('parent_id', parentMessageId)
  .eq('tenant_id', tenantId)
  .is('deleted_at', null)
  .order('created_at', { ascending: true })
  .range(offset, offset + PAGE_SIZE - 1);
```

Key differences from `useMessages`:
- Filter by `parent_id` instead of `conversation_id`
- Order by `created_at ASC` (chronological, oldest first)
- No `reply_count` needed (thread messages cannot have threads)

### Navigation Flow

#### Opening a Thread

1. User taps message bubble in chat detail
2. If `message.reply_count > 0`, navigate to thread view
3. Pass `parentMessageId` as route parameter

```typescript
const handleMessagePress = useCallback((message: MessageWithSender) => {
  if (message.reply_count && message.reply_count > 0) {
    router.push(`/chat/thread/${message.id}`);
  }
}, [router]);
```

#### Closing a Thread

1. User taps back button or X in header
2. Navigate back to chat detail screen
3. Thread view maintains scroll position on return (if within same session)

### Real-Time Updates

#### In Chat Detail

When a new message arrives with `parent_id`:
1. Do NOT add to main message list (it's a thread reply)
2. Increment the parent message's `reply_count` in local state

```typescript
onInsert: (message: MessageWithSender) => {
  if (message.parent_id) {
    // Update parent message reply_count
    setRealTimeMessages((prev) =>
      prev.map((m) =>
        m.id === message.parent_id
          ? { ...m, reply_count: (m.reply_count ?? 0) + 1 }
          : m
      )
    );
  } else {
    // Add top-level message to list
    setRealTimeMessages((prev) => appendMessage(prev, message));
  }
};
```

#### In Thread View

Subscribe to messages where `parent_id = parentMessageId`:

```typescript
const channel = supabase
  .channel(`thread:${parentMessageId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `parent_id=eq.${parentMessageId}`,
    },
    (payload) => onNewReply(payload.new as Message)
  )
  .subscribe();
```

### RLS Enforcement

Thread messages automatically inherit RLS from the messages table:

```sql
-- Existing RLS policy on messages
CREATE POLICY tenant_isolation ON messages
  FOR SELECT
  USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Event Chat visibility also applies to threads
CREATE POLICY event_chat_visibility ON messages
  FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM event_chat_exclusions
      WHERE event_chat_exclusions.message_id = messages.id
        AND event_chat_exclusions.excluded_membership_id = auth.jwt() ->> 'membership_id'
    )
  );
```

### Test Scenarios

#### Positive Tests

| Test | Description | Expected Result |
|------|-------------|-----------------|
| Create thread | Reply to top-level message | Message created with `parent_id` set |
| View thread indicator | Message has replies | Shows 💬 badge with count |
| Open thread view | Tap message with replies | Thread view opens with parent + replies |
| Send reply | Type and send in thread view | Reply appears, parent's reply_count increments |
| Real-time reply | Another user sends reply | New reply appears without refresh |
| Pagination | Thread has >50 replies | Older replies load on scroll |

#### Negative Tests

| Test | Description | Expected Result |
|------|-------------|-----------------|
| Nested thread attempt | Reply to a reply | Error: "Cannot reply to a reply" |
| Empty reply | Send empty content | Error: "Message content cannot be empty" |
| Tap reply in thread | Click on a reply message | Nothing happens (no nested navigation) |
| Cross-tenant access | Access thread from different tenant | 404 or empty result (RLS enforced) |

### i18n Keys

```json
{
  "thread_title": "Thread",
  "thread_replies": "{{count}} replies",
  "thread_reply_placeholder": "Reply to thread...",
  "thread_no_replies": "No replies yet",
  "thread_start_conversation": "Be the first to reply",
  "thread_cannot_nest": "Cannot reply to a reply"
}
```

### Figma References

- Thread Indicator: See `MessageBubble` component in existing Figma
- Thread View: Mirrors Chat Detail layout (reuse existing designs)

---

## Implementation Checklist

- [ ] Add i18n keys (en/ko)
- [ ] Extend `useMessages` to calculate `reply_count`
- [ ] Create `useThreadMessages` hook
- [ ] Add nested thread validation to `useSendReply`
- [ ] Create thread view screen (`app/chat/thread/[id].tsx`)
- [ ] Implement navigation from chat detail
- [ ] Update `useMessageSubscription` for thread-aware updates
- [ ] Write unit tests for hooks
- [ ] Write E2E tests for thread flows
- [ ] Update domain glossary

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-05 | Claude | Initial thread architecture specification |
