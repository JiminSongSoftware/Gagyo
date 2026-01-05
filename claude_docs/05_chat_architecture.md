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
