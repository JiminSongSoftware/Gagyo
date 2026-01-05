---
tags: [skills, standards, code-review, process]
---

# SKILL.md

## Purpose
Reusable standards and review rules for agents operating in this repo.

## Non-Negotiables

### MCP-First Hard Stop
If Supabase MCP fails, stop and notify owner. No workaround. Do not attempt alternative database access or bypass the MCP requirement.

### SDD → TDD → DDD Order
1. **Spec First**: Update /claude_docs before implementation
2. **Tests First**: Write tests before functional code
3. **Domain Boundaries**: Respect DDD boundaries in implementation

### No Secrets in Code
- No secrets in docs/code/comments/examples/screenshots/tests
- Use placeholders: `YOUR_KEY_HERE`
- Use GitHub Secrets for CI/production

### Commit/PR Rules
- Follow WHAT/WHY/HOW format
- No vibe-kanban mention except PR title postfix
- Scope and type required

### Internationalization (i18n) Hard Stop
All user-facing strings MUST use the i18n system. No hardcoded UI strings allowed.

## Code Review Checklist (Minimum)

### Spec & Documentation
- [ ] Spec updated (relevant /claude_docs module)
- [ ] Includes test implications section
- [ ] WHAT/WHY/HOW structure followed

### Testing
- [ ] Tests added first (TDD)
- [ ] Coverage includes tenant isolation where relevant
- [ ] Unit tests for new functions/components
- [ ] Integration tests for data access patterns
- [ ] E2E tests updated for critical user flows

### Security & Tenant Isolation
- [ ] No cross-tenant data exposure paths
- [ ] RLS policies include tenant_id check
- [ ] API endpoints validate tenant context
- [ ] Event Chat visibility properly enforced

### Secrets
- [ ] No new secrets or .env committed
- [ ] Placeholders used in examples
- [ ] GitHub Secrets used for CI

### UI Components
- [ ] Tamagui-first UI (no workarounds)
- [ ] Storybook entries exist for new components
- [ ] Accessibility considerations documented
- [ ] Dark mode support

### Internationalization (i18n)
- [ ] All user-facing strings use translation keys
- [ ] No hardcoded strings in component implementations
- [ ] Translation keys follow `namespace.key` naming convention
- [ ] Both `en` and `ko` locales have matching keys
- [ ] Storybook includes Korean locale variants
- [ ] `i18nKey` prop used for Text/Label components
- [ ] `labelKey` prop used for Button/Input components
- [ ] `Trans` component used for rich text (links, formatting)
- [ ] Date/number formatting uses locale utilities
- [ ] Layout handles text expansion (en is longer than ko)

### Detox E2E
- [ ] Critical user flows updated when behavior changes
- [ ] Tenant isolation scenarios covered
- [ ] Event Chat scenarios if applicable

## Project Context (Stack)

### Core Technologies
- **React Native** + **TypeScript** (enforced)
- **Expo Router** navigation
- **Tamagui** UI system
- **Expo Notifications** for push

### Internationalization
- **i18next** + **react-i18next** for translations
- **English** and **Korean** locales supported
- **date-fns** for locale-aware date/number formatting
- **Fallback**: English as default language

### State Management
- **Jotai**: Local/feature-scoped atoms
- **Zustand**: Global session and UI state (includes locale preference)

### Testing
- **Jest**: Unit tests
- **Detox**: E2E tests
- **Storybook**: Component documentation with locale switching

### Backend
- **Supabase**: Database, Auth, Real-time
- **RLS**: Row Level Security for tenant isolation

### Monitoring
- **Sentry**: Error tracking
- **PostHog**: Analytics

## i18n Implementation Standards

### Component Props Pattern

```typescript
// Text component
<Text i18nKey="common.app_name" />

// Text with interpolation
<Text i18nKey="common.greeting" i18nParams={{ name: 'John' }} />

// Button component
<Button labelKey="common.save" variant="primary" />

// Input component
<Input
  labelKey="auth.login.email"
  placeholderKey="auth.login.email_placeholder"
/>

// Rich text with links
<Trans
  i18nKey="common.terms"
  components={{ link: <Link href="/terms" /> }}
/>
```

### Locale Switching Flow
1. User selects language in Settings
2. `useLocale` hook calls `changeLocale()`
3. Preference saved to AsyncStorage
4. i18next instance updates
5. All components re-render with new locale
6. Changes persist across app restarts

### Fallback Behavior
- Missing Korean keys fall back to English
- Missing keys in both locales display the key name
- Test fallback: `common.test_fallback_key` exists in en only

### Pre-Commit Validation
- `bun run i18n:validate` checks key parity
- Fails commit if en/ko keys don't match
- Run manually: `node scripts/check-i18n-js.mjs`

## Output Standards

### When Proposing Changes
- Provide concrete file paths
- Show minimal diffs (not entire files)
- Reference applicable specs
- Include test implications
- Include i18n implications for user-facing changes

### Design Philosophy
- Prefer deterministic, testable designs
- Avoid "fast hacks" that bypass the system
- Respect existing patterns and conventions
- Keep changes focused and reviewable
- Always consider i18n impact for UI changes

### Communication
- Clear status updates
- Explicit blockers when encountered
- No silent failures or assumptions
- Reference spec documents when relevant

## Agent Coordination

### Planner Responsibilities
- Delegate tasks to role agents
- Integrate outputs from multiple agents
- Ensure SDD/TDD/DDD order is followed
- Coordinate cross-cutting concerns
- Verify i18n requirements are addressed

### Role Agent Responsibilities
- Operate within defined scope
- Follow hard stop rules
- Produce required outputs
- Escalate blockers to planner
- Include i18n in all UI component work

## Quick Reference

### Commit Format
```
<type>(<scope>): <summary>

WHAT: ...
WHY: ...
HOW: ...
```

### Test File Naming
- Unit: `ComponentName.test.tsx`
- Integration: `featureName.integration.test.ts`
- E2E: `featureName.e2e.ts`
- i18n: `ComponentName.i18n.test.tsx`

### Feature Directory Structure
```
src/features/featureName/
  __tests__/
  components/
  hooks/
  atoms/
  types/
  index.ts
```

### i18n Scripts
```bash
bun run i18n:validate    # Check translation key parity
node scripts/check-i18n-js.mjs  # Portable validation (no bun)
```

### Locale Files Location
```
locales/
  en/
    common.json
    auth.json
    chat.json
    errors.json
    pastoral.json
    prayer.json
    settings.json
  ko/
    common.json
    auth.json
    chat.json
    errors.json
    pastoral.json
    prayer.json
    settings.json
```

### Translation Key Examples
```json
// common.json
{
  "app_name": "Gagyo",
  "save": "Save",
  "cancel": "Cancel",
  "greeting": "Hello, {{name}}"
}

// auth.json
{
  "sign_in": "Sign In",
  "email": "Email",
  "password": "Password"
}

// chat.json
{
  "send": "Send",
  "typing": "{{name}} is typing...",
  "typing_multiple": "{{count}} people are typing..."
}
```

## Lessons Learned: Auth & Multi-Tenancy

### Supabase Auth Integration

**Session Persistence**:
- Supabase client auto-manages session persistence with AsyncStorage adapter
- Configure `persistSession: true` and `autoRefreshToken: true` in client setup
- Session is restored on app launch automatically via `getSession()`

**Auth State Changes**:
- Always listen to `onAuthStateChange` for reactive auth state updates
- Key events: `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`, `INITIAL_SESSION`
- Use event-driven navigation guards instead of manual redirect logic

**Error Handling Pattern**:
```typescript
// Map Supabase errors to i18n keys
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('Invalid login credentials')) {
      return 'auth:invalid_credentials';
    }
    // ... more mappings
  }
  return 'errors:unknown_error';
}
```

### Tenant Context Management

**Storage Pattern**:
- Store active tenant ID in AsyncStorage (`@gagyo:active_tenant_id`)
- Validate membership on app launch before using stored tenant
- Clear tenant context on sign out (handled in `signOut()` + `SIGNED_OUT` event)

**Zustand Store Pattern**:
```typescript
interface TenantState {
  activeTenantId: string | null
  activeTenantName: string | null
  loading: boolean
  setActiveTenant: (id: string, name: string) => Promise<void>
  clearTenantContext: () => Promise<void>
  loadTenantFromStorage: () => Promise<void>
  validateMembership: (tenantId: string) => Promise<boolean>
}
```

**Membership Validation**:
- Query memberships table with `auth.uid()` from RLS context
- Filter by `status='active'` to exclude inactive/revoked memberships
- Clear tenant context if validation fails

### Navigation Guards

**AuthGuard Pattern**:
- Place in root `_layout.tsx` to catch all navigation
- Wait for both auth and tenant loading states before redirecting
- Check route segment (`segments[0] === '(auth)'`) for conditional logic

**Redirect Logic**:
```typescript
if (!user && !inAuthGroup) {
  router.replace('/(auth)/login')
} else if (user && !activeTenantId && !inAuthGroup) {
  router.replace('/(auth)/tenant-selection')
} else if (user && activeTenantId && inAuthGroup) {
  router.replace('/(tabs)')
}
```

### Testing Auth Flows

**E2E Test Organization**:
- Use `testID` props on all interactive elements
- Create helper functions for common flows (`loginAsUser`, `selectTenant`)
- Test both success and failure paths

**Integration Test Considerations**:
- RLS tests require authenticated client (anon key, not service_role)
- Create real test users via `auth.signUp()` for proper RLS testing
- Clean up test users after tests complete

### Common Pitfalls

**Circular Dependencies**:
- Avoid importing stores directly in auth utilities
- Use dynamic imports: `const { useTenantStore } = await import('@/stores/tenantStore')`

**Async Storage Timing**:
- Tenant loading is async; show loading state until complete
- Don't render protected screens before tenant is validated

**Event Listener Cleanup**:
- Always unsubscribe from `onAuthStateChange` in useEffect cleanup
- Otherwise, multiple listeners stack up on hot reload

**i18n for Error Messages**:
- Return i18n keys from error functions, not formatted strings
- Call `t()` in UI layer, not in utility functions
- Example: `getAuthErrorMessage(error)` returns `'auth:invalid_credentials'`, not translated text

## Lessons Learned: Home Screen & Tab Navigation

### Tab Navigation Structure

**File-Based Routing with Expo Router**:
- Tabs are defined in `app/(tabs)/_layout.tsx` using the `Tabs` component
- Each tab has a corresponding file in `app/(tabs)/` directory (e.g., `index.tsx`, `chat.tsx`)
- Tab bar uses Ionicons for visual consistency
- Tab titles are fully internationalized via `useTranslation()` hook

**Tab Configuration**:
```typescript
<Tabs screenOptions={{
  tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
  headerShown: false
}}>
  <Tabs.Screen
    name="index"
    options={{
      title: t('common.nav.home'),
      tabBarIcon: ({ color, size }) => (
        <Ionicons name="home" size={size} color={color} />
      )
    }}
  />
  {/* Additional tabs: chat, prayer, pastoral, images, settings */}
</Tabs>
```

**Six Primary Tabs**:
1. **Home** (`index.tsx`) - Dashboard with widgets and quick actions
2. **Chat** - Conversation list and messaging
3. **Prayer** - Prayer card management
4. **Pastoral Journal** - Pastoral notes and records
5. **Images** - Image gallery and management
6. **Settings** - User preferences and logout

### Home Screen Components

**DashboardWidget Pattern**:
- Reusable component for consistent dashboard cards
- Supports empty state with customizable message
- Optional "View All" button that hides when empty
- Exports from `@/components/home` for clean imports

**DashboardWidget Props**:
```typescript
interface DashboardWidgetProps {
  titleKey: string;           // i18n key for widget title
  isEmpty?: boolean;          // Show empty state if true
  emptyStateKey?: string;     // i18n key for empty message
  onViewAll?: () => void;     // Navigation callback
  children?: React.ReactNode; // Content when not empty
  testID?: string;            // For E2E testing
}
```

**Home Screen Layout**:
```typescript
<Container flex={1}>
  <ScrollView contentContainerStyle={{ padding: 16 }}>
    <Column gap="$4">
      {/* Welcome message with tenant name */}
      <Heading
        i18nKey="common.home_screen.welcome"
        i18nParams={{ churchName: activeTenantName }}
      />

      {/* Dashboard Title */}
      <Heading i18nKey="common.home_screen.dashboard_title" />

      {/* Widgets */}
      <DashboardWidget titleKey="common.home_screen.recent_conversations" ... />
      <DashboardWidget titleKey="common.home_screen.prayer_summary" ... />
      <DashboardWidget titleKey="common.home_screen.pastoral_status" ... />

      {/* Quick Actions */}
      <Heading i18nKey="common.home_screen.quick_actions" />
      <Column gap="$2">
        <Button labelKey="common.home_screen.start_conversation" ... />
        <Button labelKey="common.home_screen.create_prayer" ... />
        <Button labelKey="common.home_screen.write_journal" ... />
      </Column>
    </Column>
  </ScrollView>
</Container>
```

### Translation Keys

**Navigation Keys** (`common.nav.*`):
- `home`: "Home" / "홈"
- `chat`: "Chat" / "채팅"
- `prayer`: "Prayer" / "기도"
- `pastoral`: "Pastoral Journal" / "목회 일지"
- `images`: "Images" / "이미지"
- `settings`: "Settings" / "설정"

**Home Screen Keys** (`common.home_screen.*`):
- `welcome`: "Welcome to {{churchName}}" / "{{churchName}}에 오신 것을 환영합니다"
- `dashboard_title`: "Dashboard" / "대시보드"
- `recent_conversations`: "Recent Conversations" / "최근 대화"
- `prayer_summary`: "Prayer Cards" / "기도 카드"
- `pastoral_status`: "Pastoral Journal" / "목회 일지"
- `no_recent_activity`: "No recent activity" / "최근 활동 없음"
- `quick_actions`: "Quick Actions" / "빠른 작업"
- `start_conversation`: "Start Conversation" / "대화 시작"
- `create_prayer`: "Create Prayer Card" / "기도 카드 작성"
- `write_journal`: "Write Journal Entry" / "일지 작성"
- `view_all`: "View All" / "모두 보기"

### E2E Test Helpers

**Navigation Helpers** (`e2e/helpers/navigation-helpers.ts`):
- `navigateToTab(tabName, options)` - Navigate to specific tab
- `expectScreen(screenId, options)` - Assert screen visibility
- `completeAuthAndExpectHome(...)` - Auth flow + home screen assertion
- `expectAllTabsVisible(locale)` - Verify all tabs are visible

### Testing Considerations

**Unit Tests**:
- Mock `useRequireAuth` and `useTenantContext` hooks
- Mock `useRouter` for navigation testing
- Test empty state vs populated state behavior
- Verify i18n key usage (not hardcoded strings)

**E2E Tests**:
- Use `testID` props for reliable element selection
- Test navigation flow between tabs
- Verify quick action buttons navigate correctly
- Test with both English and Korean locales

### Common Patterns

**Tenant-Aware Welcome Message**:
```typescript
const { activeTenantName } = useTenantContext();
<Heading
  i18nKey="common.home_screen.welcome"
  i18nParams={{ churchName: activeTenantName || '' }}
/>
```

**Widget Navigation**:
```typescript
<DashboardWidget
  titleKey="common.home_screen.recent_conversations"
  isEmpty={hasNoConversations}
  onViewAll={() => router.push('/(tabs)/chat')}
/>
```

**Placeholder Tab Screen**:
```typescript
import { Container, Heading } from '@/components/ui';
import { useRequireAuth } from '@/hooks/useAuthGuard';

export default function FeatureScreen() {
  const { user, tenantId } = useRequireAuth();
  return (
    <Container testID="feature-screen" centered padded flex={1}>
      <Heading level="h1" i18nKey="common.nav.feature" />
    </Container>
  );
}
```

## Lessons Learned: Chat Feature

### Chat Architecture Overview

**Multi-Tenant Chat Isolation**:
- All messages and conversations are scoped by `tenant_id`
- RLS policies ensure users can only access conversations from their tenant
- Conversation participants table controls access to individual conversations
- Cross-tenant message access is prevented at database level

**Conversation Types**:
- `direct`: 1-on-1 messaging between two users
- `small_group`: Group chat for small group members
- `ministry`: Ministry-wide communication
- `church_wide`: Entire church announcements

**Room Type Visual Differentiation**:
- Each conversation type has a unique background color in the theme
- `small_group`: `$backgroundWarm` (warm tone)
- `ministry`: `$backgroundCool` (cool tone)
- `church_wide`: `$backgroundAccent` (accent/pink tone)
- `direct`: `$background` (default background)

### Message Display Patterns

**Inverted FlatList for Chat**:
```typescript
<FlatList
  inverted // Messages flow from bottom to top (newest at bottom)
  data={messages}
  renderItem={renderItem}
  onEndReached={handleLoadMore} // Load older messages at top
  onScroll={handleScroll}
  scrollEventThrottle={400}
/>
```

**Auto-Scroll Logic**:
- Track scroll position with `isNearBottomRef`
- Only auto-scroll when user is already near bottom
- Prevents jumping when user is reading older messages
- Uses `scrollToEnd({ animated: true })` for smooth UX

**Real-Time Message State Management**:
```typescript
// Local state for real-time updates
const [realTimeMessages, setRealTimeMessages] = useState<MessageWithSender[]>([]);

// Initialize from useMessages hook
useEffect(() => {
  if (!loading && messages.length > 0) {
    setRealTimeMessages(messages);
  }
}, [messages, loading]);

// Subscribe to updates
useMessageSubscription(conversationId, tenantId, {
  onInsert: useCallback((message: MessageWithSender) => {
    setRealTimeMessages((prev) => appendMessage(prev, message));
  }, []),
  onUpdate: useCallback((message: MessageWithSender) => {
    setRealTimeMessages((prev) => updateMessage(prev, message));
  }, []),
  onDelete: useCallback((messageId: string) => {
    setRealTimeMessages((prev) => removeMessage(prev, messageId));
  }, []),
});
```

### Message Bubbles

**Styling by Ownership**:
- Own messages: Right-aligned, `$primary` background color
- Others' messages: Left-aligned, room-type background color
- System messages: Centered, muted `$color3` text

**Content Types Support**:
- `text`: Standard text message
- `image`: Image with thumbnail and expand-on-press
- `prayer_card`: Styled card with prayer request content
- `system`: Centered informational message (e.g., user joined)

**Date Separators**:
- Inserted between messages from different days
- Uses localized labels: "Today", "Yesterday", or formatted date
- Minimal padding and rounded background

### Hooks Pattern

**useMessages Hook**:
```typescript
interface UseMessagesResult {
  messages: MessageWithSender[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

// Pagination via cursor
const { messages, loading, hasMore, loadMore } = useMessages(conversationId, tenantId);
```

**useMessageSubscription Hook**:
```typescript
useMessageSubscription(conversationId, tenantId, {
  onInsert: (message) => { /* handle new message */ },
  onUpdate: (message) => { /* handle update */ },
  onDelete: (messageId) => { /* handle delete */ },
  onError: (error) => { /* handle error */ },
});
```

**useSendMessage Hook**:
```typescript
const { sendMessage, sending, error } = useSendMessage(
  conversationId,
  tenantId,
  membershipId
);

await sendMessage('Hello world');
```

### Translation Keys

**Chat Keys** (`common.chat.*`):
- `title`: "Chat" / "채팅"
- `chat`: "Chat" / "채팅"
- `empty_state`: "No conversations yet" / "아직 대화가 없습니다"
- `message_placeholder`: "Type a message..." / "메시지를 입력하세요..."
- `send`: "Send" / "전송"
- `today`: "Today" / "오늘"
- `yesterday`: "Yesterday" / "어제"
- `new_messages`: "New messages" / "새 메시지"
- `loading_messages`: "Loading messages..." / "메시지 로딩 중..."
- `no_messages`: "No messages yet" / "메시지가 없습니다"
- `start_conversation`: "Start a conversation" / "대화를 시작하세요"
- `small_group`: "Small Group" / "소그룹"
- `ministry`: "Ministry" / "사역"
- `church_wide`: "Church Wide" / "교회 전체"

### Component Structure

**Chat Feature Directory**:
```
src/features/chat/
  components/
    ConversationList.tsx      // List of all conversations
    ConversationListItem.tsx   // Individual conversation item
    MessageBubble.tsx          // Single message display
    MessageList.tsx            // Paginated message list
    MessageInput.tsx           // Text input with send button
    index.ts                   // Barrel exports
  hooks/
    index.ts                   // Barrel exports
    useConversations.ts        // Fetch conversation list
    useMessages.ts             // Fetch messages with pagination
    useSendMessage.ts          // Send message mutation
    useMessageSubscription.ts  // Real-time message updates
```

**Dynamic Route**:
```
app/chat/[id].tsx  // Chat detail screen
```

### Common Patterns

**Conversation List Item**:
```typescript
<ConversationListItem
  conversation={conversation}
  onPress={() => router.push(`/chat/${conversation.id}`)}
  testID={`conversation-item-${conversation.id}`}
/>
```

**Message Input**:
```typescript
<MessageInput
  onSend={handleSend}
  sending={sendingMessage}
  error={sendError}
  maxLength={2000}
  placeholderKey="chat.message_placeholder"
/>
```

**Room Type Background**:
```typescript
<TamaguiStack
  backgroundColor={
    conversationType === 'small_group'
      ? '$backgroundWarm'
      : conversationType === 'ministry'
      ? '$backgroundCool'
      : conversationType === 'church_wide'
      ? '$backgroundAccent'
      : '$background'
  }
>
  {/* Chat content */}
</TamaguiStack>
```

### Testing Considerations

**Unit Tests**:
- Mock `useMessages` with empty/loaded/error states
- Test message bubble rendering for each content type
- Verify room type background color application
- Test real-time subscription callback behavior

**Integration Tests**:
- Test RLS policies for cross-tenant isolation
- Verify real-time message subscriptions work
- Test message pagination (loadMore)
- Verify conversation participants control access

**E2E Tests**:
- Navigate to chat and verify list displays
- Tap conversation and verify detail screen opens
- Send message and verify it appears
- Verify room type backgrounds apply correctly
- Test navigation back to list preserves state

## Lessons Learned: Event Chat Feature

### Event Chat Overview

**What is Event Chat?**
Event Chat allows users to send messages in group chats while excluding specific members from seeing them. Primary use case: planning surprise events without the subject knowing.

**Core Capabilities**:
- Sender can select 1-5 users to exclude from seeing the message
- Excluded users never see the message in any view (list, detail, search, notifications)
- Only sender sees visual indicator (eye emoji 👁️) on Event Chat messages
- Exclusions are immutable once message is sent

### Database Schema

**messages table**:
```sql
is_event_chat BOOLEAN DEFAULT false  -- Marks Event Chat messages
```

**event_chat_exclusions table**:
```sql
message_id UUID REFERENCES messages(id) ON DELETE CASCADE
excluded_membership_id UUID REFERENCES memberships(id)
```

**RLS Policy Pattern**:
```sql
-- Messages SELECT policy filters out excluded messages
CREATE POLICY event_chat_visibility ON messages
  FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM event_chat_exclusions
      WHERE event_chat_exclusions.message_id = messages.id
        AND event_chat_exclusions.excluded_membership_id =
            (SELECT id FROM memberships WHERE user_id = auth.uid())
    )
  );
```

### API Contract

**Send Event Chat Message**:
```typescript
interface SendMessageOptions {
  content: string;
  contentType?: MessageContentType;
  excludedMembershipIds?: string[];  // For Event Chat
}

// Usage
await sendMessageWithOptions({
  content: 'Surprise party planning!',
  excludedMembershipIds: ['user-id-1', 'user-id-2'],
});
```

### Validation Rules

| Rule | Description | Enforcement |
|------|-------------|--------------|
| **Cannot exclude self** | Sender cannot be in exclusion list | Client + Database |
| **Max 5 exclusions** | Cannot select more than 5 users | Client + Database |
| **Must be member** | Excluded users must be conversation participants | Client + Database |
| **Immutable** | Once sent, exclusions cannot be modified | Database (no UPDATE) |

### UI Components

**EventChatSelector Modal** (`src/features/chat/components/EventChatSelector.tsx`):
```typescript
interface EventChatSelectorProps {
  conversationId: string;
  tenantId: string;
  currentMembershipId: string;
  visible: boolean;
  onConfirm: (excludedMembershipIds: string[]) => void;
  onCancel: () => void;
}
```

Features:
- Fetches conversation participants via Supabase
- Filters out current user from exclusion list
- Multi-select with checkboxes (max 5)
- Displays selected count (e.g., "2 of 5 selected")
- Disabled state after 5 selections with error message

**MessageInput Integration**:
```typescript
interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  onSendEventChat?: (options: SendMessageOptions) => Promise<void>;
  conversationId?: string;
  tenantId?: string;
  currentMembershipId?: string;
  // ... other props
}
```

**Event Chat Button** (👁️ icon):
- Only shown when `onSendEventChat` + all IDs are provided
- Opens EventChatSelector modal
- Disabled during message sending

**Event Chat Mode Indicator**:
- Shows when Event Chat mode is active
- Displays excluded count: "Event Chat mode (2 excluded)"
- Cancel button to exit Event Chat mode
- Warning color theme to distinguish from normal mode

### Hook Extension

**useSendMessage Hook** (`src/features/chat/hooks/useSendMessage.ts`):
```typescript
interface SendMessageState {
  sendMessage: (content: string) => Promise<MessageWithSender | null>;
  sendMessageWithOptions: (options: SendMessageOptions) => Promise<MessageWithSender | null>;
  sending: boolean;
  error: Error | null;
}

// Returns both simple and advanced send methods
const { sendMessage, sendMessageWithOptions, sending, error } = useSendMessage(
  conversationId,
  tenantId,
  membershipId
);
```

**Validation Logic** (in `sendMessageWithOptions`):
```typescript
// Validate max 5 exclusions
if (excludedMembershipIds.length > 5) {
  setError(new Error('Cannot exclude more than 5 users'));
  return null;
}

// Validate sender not in exclusion list
if (excludedMembershipIds.includes(senderMembershipId)) {
  setError(new Error('Cannot exclude yourself'));
  return null;
}

// Insert message first, then exclusions
const { data } = await supabase.from('messages').insert({...}).select().single();

if (isEventChat && excludedMembershipIds) {
  const exclusions = excludedMembershipIds.map((id) => ({
    message_id: data.id,
    excluded_membership_id: id,
  }));
  await supabase.from('event_chat_exclusions').insert(exclusions);
}
```

### Translation Keys

**Event Chat Keys** (`chat.json`):
```json
{
  "event_chat_selector_title": "Select users to exclude" / "제외할 사용자 선택",
  "event_chat_selected_count": "{{count}} of 5 selected" / "5명 중 {{count}}명 선택",
  "event_chat_max_reached": "Maximum 5 users can be excluded" / "최대 5명까지 제외 가능",
  "event_chat_mode_active": "Event Chat mode ({{count}} excluded)" / "이벤트 채팅 모드 ({{count}}명 제외)",
  "cancel_event_chat": "Cancel" / "취소",
  "confirm_event_chat": "Confirm" / "확인"
}
```

### Testing

**Integration Tests** (`__tests__/integration/event-chat-rls.test.ts`):
- Sender can see their own Event Chat message
- Excluded user cannot see Event Chat message (RLS blocks it)
- Non-excluded user can see Event Chat message
- `event_chat_exclusions` table only readable by sender
- Multiple exclusions (up to 5) work correctly
- Regular messages unaffected by Event Chat RLS

**E2E Tests** (`e2e/event-chat.test.ts`):
- Open Event Chat selector modal
- Display list of conversation participants
- Select/deselect users for exclusion
- Max 5 validation enforced
- Event Chat mode indicator shows excluded count
- Send Event Chat message with eye indicator
- Multi-user visibility (excluded vs non-excluded)
- Mode resets after sending message

**Test IDs**:
- `event-chat-button` - Event Chat toggle button
- `event-chat-selector-modal` - Selector modal
- `participant-list` - List of participants
- `exclude-user-{displayName}` - User exclusion checkbox
- `event-chat-confirm-button` - Confirm selections
- `event-chat-cancel-button` - Cancel/close selector
- `event-chat-mode-indicator` - Active mode badge
- `event-chat-indicator` - Eye emoji on message bubble
- `event-chat-send-button` - Send button in Event Chat mode

### Common Patterns

**Sending Event Chat Message**:
```typescript
const handleSendEventChat = useCallback(
  async (options: SendMessageOptions) => {
    await sendMessageWithOptions(options);
  },
  [sendMessageWithOptions]
);

<MessageInput
  onSend={handleSend}
  onSendEventChat={handleSendEventChat}
  conversationId={conversationId}
  tenantId={tenantId}
  currentMembershipId={membershipId}
/>
```

**Checking Event Chat Support**:
```typescript
const hasEventChatSupport =
  onSendEventChat && conversationId && tenantId && currentMembershipId;
```

### Security Considerations

**RLS Enforcement**:
- Messages table RLS filters out messages where user is in exclusions
- `event_chat_exclusions` table only readable by message sender
- Tenant isolation enforced at RLS level (tenant_id check)

**Client-Side Validation**:
- Max 5 exclusions enforced in UI (disabled after 5)
- Current user filtered from participant list
- Validation errors shown to user with i18n messages

### Figma References
- Event Chat UI: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=202-1163

---

## Push Notifications

### Overview

Push notifications enable real-time alerts for users across mobile devices (iOS/Android). The system uses Expo Push Notifications API with Supabase Edge Functions for trigger handling and notification delivery.

**Key Concepts**:
- Device tokens are stored per-tenant (NOT global)
- Each user can have multiple device tokens (multiple devices)
- Token lifecycle: register → rotate → invalidate
- Notifications are tenant-scoped with RLS enforcement
- Deep linking supports navigation to specific content

### Database Schema

**device_tokens** table:
```typescript
{
  id: string;                    // UUID
  tenant_id: string;             // Tenant ownership
  user_id: string;               // User ownership
  token: string;                 // Expo push token (unique per device)
  platform: 'ios' | 'android';   // Device platform
  last_used_at: string;          // Last activity timestamp
  created_at: string;
  revoked_at: string | null;     // Soft-delete for invalid tokens
}
```

**push_notification_logs** table:
```typescript
{
  id: string;                    // UUID
  tenant_id: string;             // For rate limiting per tenant
  notification_type: string;     // 'new_message', 'mention', etc.
  recipient_count: number;       // Total intended recipients
  sent_count: number;            // Successfully delivered
  failed_count: number;          // Failed deliveries
  error_summary: Json | null;    // Error details for debugging
  created_at: string;
}
```

**RLS Policies**:
- Users can only read/write their own device tokens within their tenant
- Service role required for sending notifications
- Logs are readable by admin role only

### Token Lifecycle

**Registration** (on app launch):
```typescript
// In app/_layout.tsx or root component
const { registerToken } = useDeviceToken();

useEffect(() => {
  // Register on app mount
  registerToken();
}, []);
```

**Token Rotation** (Expo may change tokens):
```typescript
// useDeviceToken detects token changes and updates
// Old token is soft-deleted (revoked_at set)
// New token inserted with same user_id
```

**Invalidation** (on logout or push receipt error):
```typescript
// Manual: User logout
const { invalidateToken } = useDeviceToken();
await invalidateToken();

// Automatic: Expo reports DeviceNotRegistered
// Edge Function marks token as revoked
```

### Tenant Scoping

**IMPORTANT**: Device tokens are NOT global. They are tenant-scoped.

When a user belongs to multiple tenants:
- Each tenant gets a separate device token record
- Same physical device, different token records per tenant
- Notifications are filtered by tenant_id at query time

```typescript
// Correct query for user's tokens in a tenant
const { data } = await supabase
  .from('device_tokens')
  .select('*')
  .eq('tenant_id', activeTenantId)  // Must filter by tenant
  .eq('user_id', userId)
  .is('revoked_at', null);
```

### Client-Side Implementation

**useDeviceToken Hook** (`src/features/notifications/useDeviceToken.ts`):
```typescript
interface DeviceTokenState {
  token: string | null;
  isRegistered: boolean;
  isPermissionGranted: boolean;
  error: string | null;
}

interface DeviceTokenActions {
  registerToken: () => Promise<void>;
  invalidateToken: () => Promise<void>;
}

const { token, isRegistered, registerToken, invalidateToken } = useDeviceToken();
```

**Setup** (required in root layout):
```typescript
import { useDeviceToken, useNotificationHandler } from '@/features/notifications';

export default function RootLayout() {
  const { registerToken } = useDeviceToken();
  const { processInitialNotification } = useNotificationHandler();

  useEffect(() => {
    registerToken();              // Register device token
    processInitialNotification(); // Handle cold-start notification
  }, []);
}
```

### Deep Linking

**URL Scheme**: `gagyo:///{screen}/{id}?{params}`

**Supported Routes**:
| Notification Type | Deep Link | Parameters |
|------------------|-----------|------------|
| new_message | `/chat/{conversationId}` | `messageId`, `threadId` |
| mention | `/chat/{conversationId}` | `messageId`, `threadId` |
| prayer_answered | `/prayer/{prayerCardId}` | - |
| pastoral_journal_submitted | `/pastoral/{journalId}` | - |
| pastoral_journal_forwarded | `/pastoral/{journalId}` | - |
| pastoral_journal_confirmed | `/pastoral/{journalId}` | - |

**useNotificationHandler Hook** (`src/features/notifications/useNotificationHandler.ts`):
```typescript
const {
  lastNotification,
  isProcessing,
  handleNotificationResponse,
  processInitialNotification,
} = useNotificationHandler();

// processInitialNotification() handles app launches from notifications
// handleNotificationResponse() handles notification taps when app is running
```

**Tenant Switching**:
When notification targets a different tenant:
1. Verify user has membership in target tenant
2. Switch activeTenantId via useTenantStore
3. Navigate to deep link after context switch

### Edge Functions

**send-push-notification** (`supabase/functions/send-push-notification/`):
- Main entry point for sending notifications
- Handles batching (100 per batch)
- Rate limiting (1000 requests/min per tenant)
- Invalid token cleanup
- Logging to push_notification_logs

**Request Format**:
```typescript
{
  tenant_id: string;
  notification_type: 'new_message' | 'mention' | 'prayer_answered' |
                   'pastoral_journal_submitted' | 'pastoral_journal_forwarded' |
                   'pastoral_journal_confirmed';
  recipients: {
    user_ids: string[];
    conversation_id?: string;        // For event chat exclusions
    exclude_user_ids?: string[];     // Explicit exclusions
  };
  payload: {
    title: string;
    body: string;
    data: Record<string, string>;    // Deep link params
  };
  options?: {
    priority?: 'normal' | 'high';
    sound?: 'default' | 'default_critical' | null;
    badge?: number | null;
  };
}
```

**handle-message-sent** (`supabase/functions/handle-message-sent/`):
- Triggered when new message created
- Sends to conversation participants (excluding sender)
- Mentions get higher priority notifications
- Respects event_chat_exclusions
- Thread context included in deep link

**handle-prayer-answered** (`supabase/functions/handle-prayer-answered/`):
- Triggered when prayer_card.status changes to 'answered'
- Recipients based on prayer scope:
  - `individual`: author only
  - `small_group`: all small group members
  - `church_wide`: all active tenant members

**handle-pastoral-journal-change** (`supabase/functions/handle-pastoral-journal-change/`):
- Triggered on pastoral_journals.status change
- Status transitions:
  - `draft` → `submitted`: Notify zone leader
  - `submitted` → `zone_reviewed`: Notify all pastors
  - `zone_reviewed` → `pastor_confirmed`: Notify original author

### Notification Payloads

**Message Notification**:
```typescript
{
  title: 'John Doe',                    // Sender name
  body: 'Message content or [Attachment]',
  data: {
    type: 'new_message',
    conversation_id: 'uuid',
    message_id: 'uuid',
    thread_id: 'uuid',                  // If thread reply
    tenant_id: 'uuid',
  },
}
```

**Mention Notification**:
```typescript
{
  title: 'Mentioned by John Doe',
  body: 'Message content...',
  data: {
    type: 'mention',
    conversation_id: 'uuid',
    message_id: 'uuid',
    thread_id: 'uuid',
    tenant_id: 'uuid',
  },
}
```

**Prayer Answered**:
```typescript
{
  title: 'Prayer Answered ✝️',
  body: 'Your prayer has been answered!',
  data: {
    type: 'prayer_answered',
    prayer_card_id: 'uuid',
    tenant_id: 'uuid',
  },
}
```

**Pastoral Journal Notifications**:
```typescript
// Submitted
{
  title: 'Pastoral Journal Submitted',
  body: 'John Doe submitted a journal for Small Group Name',
  data: {
    type: 'pastoral_journal_submitted',
    journal_id: 'uuid',
    small_group_id: 'uuid',
    tenant_id: 'uuid',
  },
}

// Forwarded
{
  title: 'Journal Ready for Review',
  body: 'Zone Leader forwarded Small Group Name\'s journal',
  data: { /* ... */ },
}

// Confirmed
{
  title: 'Pastoral Journal Confirmed ✝️',
  body: 'Pastor has reviewed your journal',
  data: { /* ... */ },
}
```

### Translation Keys

All notification strings use i18n. Add to `src/locales/{lang}.json`:

```json
{
  "notifications": {
    "newMessage": "{senderName}",
    "mention": "Mentioned by {senderName}",
    "mention_ko": "{senderName}님이 멘션함",
    "prayerAnswered": "Prayer Answered ✝️",
    "prayerAnswered_ko": "기도가 응답되었습니다 ✝️",
    "pastoralSubmitted": "Pastoral Journal Submitted",
    "pastoralSubmitted_ko": "목양 일지 제출",
    "pastoralForwarded": "Journal Ready for Review",
    "pastoralForwarded_ko": "목양 일지 검토 대기",
    "pastoralConfirmed": "Pastoral Journal Confirmed ✝️",
    "pastoralConfirmed_ko": "목양 일지 확정 ✝️"
  }
}
```

### Environment Variables

**Required**:
```bash
# Expo Push Notifications
EXPO_PROJECT_ID=your-expo-project-id
EXPO_ACCESS_TOKEN=your-expo-access-token

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

**Set in Supabase Dashboard**:
1. Go to Edge Functions
2. Select function
3. Settings → Environment Variables

### Batching and Rate Limiting

**Batching**:
- Expo API accepts up to 100 messages per request
- Edge Function automatically batches large recipient lists
- Each batch is a separate API call

**Rate Limiting**:
- 1000 requests per minute per tenant
- In-memory tracking (use Redis for multi-instance)
- Returns 429 status with retry-after header when exceeded

**Token Cleanup**:
- Invalid tokens marked as revoked immediately
- Uses 90-day inactivity check for stale tokens
- Expo API errors trigger cleanup (DeviceNotRegistered)

### Testing

**Unit Tests** (`src/features/notifications/__tests__/`):
```bash
bun test useDeviceToken.test.ts
bun test useNotificationHandler.test.ts
```

**Integration Tests** (require DATABASE_URL):
```bash
DATABASE_URL="postgresql://..." bun test device-token-integration.test.ts
```

**E2E Tests** (Detox):
```bash
bun test e2e/push-notifications.test.ts
```

**Test Scenarios**:
- Token registration flow
- Permission request handling
- Token rotation detection
- Notification receipt and display
- Deep link navigation
- Tenant switching
- Multi-device support

### Security Considerations

**RLS Enforcement**:
- device_tokens: Users can only read/write their own tokens
- push_notification_logs: Admin-only access
- Tenant isolation enforced at query level

**Authorization**:
- Edge Functions require Bearer token (service role or valid JWT)
- Client cannot directly call send-push-notification
- Trigger functions authorized via service role

**Data Privacy**:
- Notification payloads logged in plain text (admin only)
- User data in notifications minimized (display names only)
- Deep link data contains IDs, not sensitive info

### Common Patterns

**Sending Notification from Edge Function**:
```typescript
const response = await fetch(
  `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      tenant_id: tenantId,
      notification_type: 'new_message',
      recipients: { user_ids: recipientUserIds },
      payload: {
        title: 'New Message',
        body: 'You have a new message',
        data: { conversation_id: conversationId },
      },
    }),
  }
);
```

**Checking Push Support**:
```typescript
import * as Device from 'expo-device';

const isDeviceSupported = Device.isDevice;
if (!isDeviceSupported) {
  // Running in simulator, push not supported
}
```

**Handling Notification Permissions**:
```typescript
import * as Notifications from 'expo-notifications';

const { status: existingStatus } = await Notifications.getPermissionsAsync();
if (existingStatus !== 'granted') {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    // Permission denied
    return;
  }
}
```

### Figma References
- Notification settings: [To be added]
- Permission flow: [To be added]

### Related Documentation
- `claude_docs/06_push_notifications.md` - Full push notification specification
- `supabase/functions/*/index.ts` - Edge Function implementations
- `src/features/notifications/` - Client-side notification features
