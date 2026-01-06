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
- `claude_docs/19_prayer_analytics.md` - Prayer analytics specification
- `supabase/functions/*/index.ts` - Edge Function implementations
- `src/features/notifications/` - Client-side notification features

---

## Lessons Learned: Prayer Analytics

### Overview

**What is Prayer Analytics?**
Prayer Analytics provides statistical insights into prayer activity across three scopes (individual, small group, church-wide) and five time periods (weekly, monthly, quarterly, semi-annual, annual). The feature displays total prayers, answered prayers, and answer rate with a simple bar chart visualization.

**Key Capabilities**:
- Three visibility scopes with RLS enforcement
- Five configurable time periods with date range calculations
- Three metrics: total prayers, answered prayers, answer rate (rounded to 1 decimal)
- Custom bar chart visualization using Tamagui
- Full i18n support (English + Korean)

### Database Schema

**prayer_cards table** (analytics queries this table):
```sql
id              UUID PRIMARY KEY
tenant_id       UUID  -- Tenant ownership (RLS enforced)
author_id       UUID  -- FK to memberships (creator)
recipient_scope enum -- 'individual' | 'small_group' | 'church_wide'
answered        BOOLEAN
answered_at     TIMESTAMP
created_at      TIMESTAMP
title           TEXT
content         TEXT
```

**RLS Policies for Analytics**:
- Individual scope: `author_id = current_membership_id`
- Small group scope: `recipient_scope='small_group'` + RLS checks small group membership
- Church-wide scope: `recipient_scope='church_wide'` (all tenant members)
- Tenant isolation: All queries include `tenant_id` filter

### Query Patterns

**Individual Scope**:
```typescript
supabase
  .from('prayer_cards')
  .select('id, answered, created_at')
  .eq('tenant_id', tenantId)
  .eq('author_id', membershipId)
  .gte('created_at', startDate)
  .lte('created_at', endDate)
```

**Small Group Scope**:
```typescript
supabase
  .from('prayer_cards')
  .select('id, answered, created_at')
  .eq('tenant_id', tenantId)
  .eq('recipient_scope', 'small_group')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
// RLS handles small group membership filtering
```

**Church-wide Scope**:
```typescript
supabase
  .from('prayer_cards')
  .select('id, answered, created_at')
  .eq('tenant_id', tenantId)
  .eq('recipient_scope', 'church_wide')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
```

### Date Range Calculations

```typescript
function getDateRange(period: AnalyticsPeriod): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString();
  let startDate: Date;

  switch (period) {
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarterly':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'semi_annual':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 6);
      break;
    case 'annual':
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  return { startDate: startDate.toISOString(), endDate };
}
```

### Metrics Calculation

```typescript
const totalPrayers = prayerCards.length;
const answeredPrayers = prayerCards.filter(p => p.answered).length;
const answerRate = totalPrayers > 0
  ? Math.round((answeredPrayers / totalPrayers) * 100 * 10) / 10  // Round to 1 decimal
  : 0;
```

**Edge Cases**:
- Zero prayers: `answerRate = 0` (not NaN or undefined)
- All answered: `answerRate = 100.0`
- None answered: `answerRate = 0.0`
- Rounding: 1 decimal place (e.g., 66.7%)

### UI Components

**PrayerAnalyticsSheet** (`src/features/prayer/components/PrayerAnalyticsSheet.tsx`):
```typescript
interface PrayerAnalyticsSheetProps {
  tenantId: string;              // The tenant ID for analytics
  membershipId: string;          // The current user's membership ID
  smallGroupId: string | null;   // The current user's small group ID
  onClose: () => void;           // Callback when sheet is closed
  visible: boolean;              // Whether the sheet is visible
}
```

**Component Structure**:
- SheetOverlay (backdrop tap to close)
- SheetContent (slide-up panel with rounded corners)
- HandleBar (drag indicator)
- Scope Tabs (My Statistics, Small Group Statistics, Church-wide Statistics)
- Period Selector (horizontal scroll: Weekly, Monthly, Quarterly, Semi-annual, Annual)
- Stat Cards (Total Prayers, Answered Prayers, Answer Rate)
- SimpleBarChart (three proportional bars: Total, Answered, Unanswered)

**Custom Bar Chart Decision**:
- Used custom Tamagui Stack implementation instead of external charting library
- Reasons: Bundle size efficiency, full Tamagui theme integration, simplicity for three-bar visualization
- Evaluated: Victory Native, react-native-gifted-charts, react-native-svg-charts
- Decision documented in SDD spec

### Hook Interface

**usePrayerAnalytics** (`src/features/prayer/hooks/usePrayerAnalytics.ts`):
```typescript
interface PrayerAnalyticsState {
  analytics: PrayerAnalytics | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface PrayerAnalytics {
  totalPrayers: number;
  answeredPrayers: number;
  answerRate: number;
  period: AnalyticsPeriod;
  scope: AnalyticsScope;
}

const { analytics, loading, error, refetch } = usePrayerAnalytics(
  tenantId,
  scope,      // 'individual' | 'small_group' | 'church_wide'
  scopeId,    // membershipId | smallGroupId | null
  period      // 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
);
```

### Translation Keys

**Prayer Analytics Keys** (`prayer.json`):
```json
{
  "analytics_title": "Prayer Analytics" / "기도 통계",
  "my_statistics": "My Statistics" / "내 통계",
  "small_group_statistics": "Small Group Statistics" / "소그룹 통계",
  "church_wide_statistics": "Church-wide Statistics" / "교회 전체 통계",
  "total_prayers": "Total Prayers" / "총 기도",
  "answered_prayers": "Answered Prayers" / "응답된 기도",
  "answered_rate": "Answer Rate" / "응답률",
  "weekly": "Weekly" / "주간",
  "monthly": "Monthly" / "월간",
  "quarterly": "Quarterly" / "분기",
  "semi_annual": "Semi-annual" / "반기",
  "annual": "Annual" / "연간",
  "total": "Total" / "전체",
  "answered": "Answered" / "응답됨",
  "unanswered": "Unanswered" / "기도 중",
  "no_prayers": "No prayer cards yet" / "기도 카드가 없습니다",
  "start_praying": "Start by creating a prayer card" / "기도 카드를 작성해 보세요"
}
```

### Key Implementation Gotchas

**Answer Rate Calculation**:
```typescript
// WRONG - can result in NaN
answerRate = (answeredPrayers / totalPrayers) * 100

// CORRECT - handles zero case explicitly
answerRate = totalPrayers > 0
  ? (answeredPrayers / totalPrayers) * 100
  : 0;
```

**Small Group Scope**:
- Uses `recipient_scope='small_group'` filter (not a direct join)
- RLS policy handles actual small group membership verification
- Don't need to query `prayer_card_recipients` table

**Church-wide Scope**:
- Uses `recipient_scope='church_wide'` filter
- Simpler than small group - no membership check needed in query
- All tenant members can query these prayers

**Date Range Boundary Edge Cases**:
- Use ISO strings for consistent timezone handling
- Inclusive range: `gte` for start date, `lte` for end date
- Prayers created exactly at period boundaries are included

### Testing

**Unit Tests** (`src/features/prayer/hooks/__tests__/usePrayerAnalytics.test.ts`):
- Analytics calculations for all scopes
- Date range logic for all five periods
- Edge cases: zero prayers, all answered, none answered
- Rounding behavior (1 decimal place)
- Loading state transitions
- Error handling (network failures, invalid tenant ID)
- `refetch` function behavior

**Integration Tests** (`__tests__/integration/prayer-analytics-rls.test.ts`):
- Individual scope: User can query own prayers, cannot see others
- Small group scope: User can query small group prayers only
- Church-wide scope: All tenant members can query
- Cross-tenant isolation enforced
- Date range filtering for all five periods

**E2E Tests** (`e2e/prayer.test.ts`):
- Opening analytics sheet from prayer screen
- Switching between three scope tabs
- Switching between five period buttons
- Displaying stat cards with correct values
- Displaying bar chart visualization
- Empty state when no prayers exist
- Closing analytics sheet
- i18n: Analytics UI in both English and Korean

**Test IDs**:
- `analytics-sheet-overlay` - Backdrop overlay
- `analytics-sheet-content` - Sheet content container
- `analytics-title` - Sheet title
- `close-analytics-button` - Close button
- `tab-my-stats` - Individual scope tab
- `tab-group-stats` - Small group scope tab
- `tab-church-stats` - Church-wide scope tab
- `period-{weekly|monthly|...}` - Period buttons
- `analytics-loading` - Loading state
- `analytics-error` - Error state
- `stat-total` - Total prayers card
- `stat-answered` - Answered prayers card
- `stat-rate` - Answer rate card
- `bar-answered` - Answered bar in chart
- `bar-unanswered` - Unanswered bar in chart
- `analytics-empty` - Empty state

### Common Patterns

**Opening Analytics Sheet**:
```typescript
const [analyticsVisible, setAnalyticsVisible] = useState(false);

<PrayerAnalyticsSheet
  tenantId={activeTenantId}
  membershipId={membershipId}
  smallGroupId={smallGroupId}
  visible={analyticsVisible}
  onClose={() => setAnalyticsVisible(false)}
/>
```

**Fetching Analytics for Different Scopes**:
```typescript
// Individual stats
const { analytics: individualStats } = usePrayerAnalytics(
  tenantId,
  'individual',
  membershipId,
  'monthly'
);

// Small group stats
const { analytics: groupStats } = usePrayerAnalytics(
  tenantId,
  'small_group',
  smallGroupId,
  'monthly'
);

// Church-wide stats
const { analytics: churchStats } = usePrayerAnalytics(
  tenantId,
  'church_wide',
  null,
  'monthly'
);
```

**Handling Zero Prayers Edge Case**:
```typescript
// In PrayerAnalyticsSheet component
{analytics && analytics.totalPrayers === 0 && (
  <YStack testID="analytics-empty">
    <Text>{t('prayer.no_prayers')}</Text>
    <Text>{t('prayer.start_praying')}</Text>
  </YStack>
)}
```

### Figma References
- Prayer Analytics UI: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=354-39531

### Related Files

**Source Files**:
- `src/features/prayer/hooks/usePrayerAnalytics.ts` - Analytics hook
- `src/features/prayer/components/PrayerAnalyticsSheet.tsx` - Bottom sheet component

**Test Files**:
- `src/features/prayer/hooks/__tests__/usePrayerAnalytics.test.ts` - Unit tests
- `__tests__/integration/prayer-analytics-rls.test.ts` - Integration tests
- `e2e/prayer.test.ts` - E2E tests

**Documentation**:
- `claude_docs/19_prayer_analytics.md` - SDD specification
- `locales/en/prayer.json` - English translations
- `locales/ko/prayer.json` - Korean translations

---

## Lessons Learned: Pastoral Journal Feature

### Overview

**What is Pastoral Journal?**
Pastoral Journal is a weekly ministry documentation system for small group leaders. It implements a hierarchical review workflow where leaders submit journals, zone leaders review and forward them, and pastors provide final confirmation. Each status transition triggers push notifications to relevant parties.

**Key Capabilities**:
- Weekly journals created by small group leaders and co-leaders
- Hierarchical review: draft → submitted → zone_reviewed → pastor_confirmed
- Role-based access control via RLS (leaders see their group's, zone leaders see zone, pastors see all)
- Attendance tracking (present, absent, new visitors)
- Prayer requests, highlights, concerns, and next steps
- Comment system for zone leaders and pastors
- Push notifications at each status transition
- One journal per week per small group (duplicate prevention)

### Database Schema

**pastoral_journals table**:
```sql
id                  UUID PRIMARY KEY
tenant_id           UUID  -- Tenant ownership (RLS enforced)
small_group_id      UUID  -- FK to small_groups
author_id           UUID  -- FK to memberships (creator)
status              enum  -- 'draft' | 'submitted' | 'zone_reviewed' | 'pastor_confirmed'
week_start_date     DATE  -- Monday of the reported week
content             JSONB -- { attendance, prayerRequests, highlights, concerns, nextSteps }
submitted_at        TIMESTAMP
zone_reviewed_at    TIMESTAMP
pastor_confirmed_at TIMESTAMP
created_at          TIMESTAMP
updated_at          TIMESTAMP

UNIQUE(tenant_id, small_group_id, week_start_date)  -- One journal per week per group
```

**pastoral_journal_comments table**:
```sql
id                    UUID PRIMARY KEY
tenant_id             UUID  -- Tenant ownership (RLS enforced)
pastoral_journal_id   UUID  -- FK to pastoral_journals
author_membership_id  UUID  -- FK to memberships (commenter)
content              TEXT   -- Comment text
created_at           TIMESTAMP
```

**RLS Policies**:
- Leaders can read/create journals for their own small_group_id
- Zone leaders can read journals from their zone
- Pastors/admins can read all journals in their tenant
- Only zone leaders, pastors, and admins can add comments
- Tenant isolation enforced via tenant_id check

### Status Transition Workflow

```
draft → submitted → zone_reviewed → pastor_confirmed
  ↑          ↓              ↓              ↓
leader    zone leader    zone leader    pastor/admin
```

**Transition Rules**:
| From | To | Who Can Change | Notification Recipients |
|------|----|----------------|-------------------------|
| draft | submitted | Leader, co-leader | Zone leader |
| submitted | zone_reviewed | Zone leader | All pastors |
| zone_reviewed | pastor_confirmed | Pastor, admin | Original author |

### Hook Interfaces

**usePastoralJournals** (`src/features/pastoral/hooks/usePastoralJournals.ts`):
```typescript
interface PastoralJournalsState {
  journals: PastoralJournalWithRelations[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

interface PastoralJournalsFilter {
  scope: 'my_journals' | 'submitted_journals' | 'all_journals';
  status?: PastoralJournalStatus;
}

const { journals, loading, hasMore, loadMore, refetch } = usePastoralJournals(
  tenantId,
  membershipId,
  membership,
  { scope: 'my_journals' }  // filter
);
```

**useCreatePastoralJournal** (`src/features/pastoral/hooks/useCreatePastoralJournal.ts`):
```typescript
interface CreatePastoralJournalState {
  createJournal: (options: CreatePastoralJournalOptions) => Promise<string | null>;
  creating: boolean;
  error: Error | null;
}

interface CreatePastoralJournalOptions {
  weekStartDate: string;  // ISO date string for Monday of the week
  content: PastoralJournalContent;
  submitForReview?: boolean;  // If true, status='submitted', else 'draft'
}

const { createJournal, creating, error } = useCreatePastoralJournal(
  tenantId,
  smallGroupId,
  authorMembershipId
);
```

**useUpdatePastoralJournalStatus** (`src/features/pastoral/hooks/useUpdatePastoralJournalStatus.ts`):
```typescript
interface UpdatePastoralJournalStatusState {
  updateStatus: (options: UpdatePastoralJournalStatusOptions) => Promise<boolean>;
  updating: boolean;
  error: Error | null;
}

const { updateStatus, updating, error } = useUpdatePastoralJournalStatus(
  tenantId,
  membership
);
```

**usePastoralJournalComments** (`src/features/pastoral/hooks/usePastoralJournalComments.ts`):
```typescript
interface PastoralJournalCommentsState {
  comments: PastoralJournalCommentWithAuthor[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const { comments, loading, refetch } = usePastoralJournalComments(
  journalId,
  tenantId,
  enableRealtime  // enables Supabase realtime subscription
);
```

**useAddPastoralJournalComment** (`src/features/pastoral/hooks/useAddPastoralJournalComment.ts`):
```typescript
interface AddPastoralJournalCommentState {
  addComment: (content: string) => Promise<string | null>;
  adding: boolean;
  error: Error | null;
}

const { addComment, adding, error } = useAddPastoralJournalComment(
  journalId,
  tenantId,
  membershipId,
  membership  // Must be zone_leader, pastor, or admin
);
```

### Validation Rules

| Rule | Description | Enforcement |
|------|-------------|--------------|
| **One journal per week per group** | UNIQUE constraint on (tenant_id, small_group_id, week_start_date) | Database + Client |
| **Leaders can only create for their group** | small_group_id must match membership.small_group_id | RLS + Client |
| **Status transitions follow workflow** | Cannot skip states or go backward | Client validation + RLS |
| **Array size limits** | Max 10 items per array field | Client validation |
| **String length limits** | Max 500 chars per string item | Client validation |
| **Attendance values** | Non-negative, max 9999 | Client validation |
| **Comments by authorized roles only** | Only zone_leader, pastor, admin | RLS + Client |

### Content Schema

**Pastoral Journal Content** (`content` field):
```typescript
interface PastoralJournalContent {
  attendance?: {
    present: number;
    absent: number;
    newVisitors: number;
  };
  prayerRequests?: string[];  // Max 10, max 500 chars each
  highlights?: string[];      // Max 10, max 500 chars each
  concerns?: string[];        // Max 10, max 500 chars each
  nextSteps?: string[];       // Max 10, max 500 chars each
}
```

### Translation Keys

**Pastoral Keys** (`pastoral.json`):
```json
{
  "filter_my_journals": "My Journals" / "내 일지",
  "filter_submitted": "Submitted" / "제출됨",
  "filter_all_journals": "All Journals" / "모든 일지",
  "status_draft": "Draft" / "임시저장",
  "status_submitted": "Submitted" / "제출됨",
  "status_zone_reviewed": "Zone Reviewed" / "지부 검토됨",
  "status_pastor_confirmed": "Pastor Confirmed" / "목사 확인됨",
  "week_of": "Week of {{date}}" / "{{date}} 주간",
  "present": "Present" / "출석",
  "absent": "Absent" / "결석",
  "new": "New" / "새신자",
  "submit_for_review": "Submit for Review" / "제출하기",
  "forward_to_pastor": "Forward to Pastor" / "목사에게 전달",
  "confirm_journal": "Confirm Journal" / "일지 확인",
  "add_comment": "Add Comment" / "댓글 추가",
  "empty_no_journals": "No journals yet" / "아직 일지가 없습니다",
  "empty_no_submitted": "No submitted journals" / "제출된 일지가 없습니다",
  "empty_create_first": "Create your first journal" / "첫 번째 일지를 작성해보세요",
  "error_loading": "Failed to load journals" / "일지를 불러오지 못했습니다",
  "unknown_author": "Unknown" / "알 수 없음"
}
```

### UI Components

**Pastoral Journal List** (`src/features/pastoral/components/PastoralJournalList.tsx`):
- Filter tabs based on user role
- Pull-to-refresh support
- Pagination with load more
- Journal cards with status badge, attendance summary, author info
- Empty states with contextual messages

**Pastoral Journal Detail** (`src/features/pastoral/components/PastoralJournalDetail.tsx`):
- Full content display (attendance, prayer requests, highlights, concerns, next steps)
- Status badge with color coding
- Comments section with real-time updates
- Action buttons based on role and current status
- Comment form for authorized users

**Create Pastoral Journal Form** (`src/features/pastoral/components/CreatePastoralJournalForm.tsx`):
- Week selector with previous/next navigation
- Attendance counters with increment/decrement buttons
- Array inputs for prayer requests, highlights, concerns, next steps
- Draft and submit actions with validation
- Only accessible to leaders and co-leaders

### Key Implementation Gotchas

**Duplicate Prevention**:
```typescript
// Check for existing journal BEFORE inserting
const { data: existingJournal } = await supabase
  .from('pastoral_journals')
  .select('id, status')
  .eq('tenant_id', tenantId)
  .eq('small_group_id', smallGroupId)
  .eq('week_start_date', weekStartDate)
  .maybeSingle();

if (existingJournal) {
  throw new Error(`A journal for this week already exists (${existingJournal.status}).`);
}
```

**Status Transition Validation**:
```typescript
const VALID_TRANSITIONS: Record<PastoralJournalStatus, PastoralJournalStatus[]> = {
  draft: ['submitted'],
  submitted: ['zone_reviewed'],
  zone_reviewed: ['pastor_confirmed'],
  pastor_confirmed: [],  // Terminal state
};

const allowedTransitions = VALID_TRANSITIONS[oldStatus] || [];
if (!allowedTransitions.includes(newStatus)) {
  throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
}
```

**Week Start Date Calculation**:
```typescript
function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);  // Adjust for Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
```

### Testing

**Unit Tests** (`src/features/pastoral/hooks/__tests__/`):
- `usePastoralJournals.test.ts` - Fetching, filtering, pagination
- `useCreatePastoralJournal.test.ts` - Creation, validation, duplicate prevention
- `useUpdatePastoralJournalStatus.test.ts` - Status transitions, validation
- `usePastoralJournalComments.test.ts` - Fetching, real-time updates
- `useAddPastoralJournalComment.test.ts` - Comment creation, authorization

**Integration Tests** (`__tests__/integration/pastoral-journal-rls.test.ts`):
- Leaders can only read their own group's journals
- Zone leaders can read journals from their zone
- Pastors can read all journals in their tenant
- Only leaders can create journals
- Only zone leaders, pastors, admins can add comments
- Cross-tenant isolation enforced
- Duplicate prevention works

**E2E Tests** (`e2e/pastoral-journal.test.ts`):
- Create journal as leader
- Submit journal for review
- Forward to pastor as zone leader
- Confirm journal as pastor
- Verify notifications at each step
- Filter tabs work correctly
- Empty states display
- Pull-to-refresh works

**Test IDs**:
- `pastoral-journal-list` - Main list container
- `filter-{my_journals|submitted_journals|all_journals}` - Filter tabs
- `journal-card-{id}` - Journal card item
- `create-journal-fab` - Floating action button
- `journal-detail` - Detail screen container
- `submit-for-review-button` - Submit action
- `forward-to-pastor-button` - Forward action
- `confirm-journal-button` - Confirm action
- `comment-form` - Comment input form

### Common Patterns

**Creating a Journal**:
```typescript
const { createJournal, creating, error } = useCreatePastoralJournal(
  tenantId,
  membership?.small_group_id,
  membershipId
);

const handleSubmit = async () => {
  const journalId = await createJournal({
    weekStartDate: getWeekMonday(new Date()).toISOString().split('T')[0],
    content: {
      attendance: { present: 15, absent: 1, newVisitors: 2 },
      prayerRequests: ['Pray for health'],
      highlights: ['Great discussion'],
    },
    submitForReview: false,  // Save as draft
  });

  if (journalId) {
    router.push(`/pastoral/${journalId}`);
  }
};
```

**Updating Status**:
```typescript
const { updateStatus, updating } = useUpdatePastoralJournalStatus(tenantId, membership);

const handleForward = async () => {
  await updateStatus({
    journalId: journal.id,
    oldStatus: 'submitted',
    newStatus: 'zone_reviewed',
  });
  // Edge function automatically sends notifications
};
```

**Real-Time Comments**:
```typescript
const { comments, loading } = usePastoralJournalComments(
  journalId,
  tenantId,
  true  // Enable real-time updates
);
// Comments update automatically when others add them
```

### Deep Linking

**URL Pattern**: `/pastoral/{journalId}`

**Notification Triggers**:
- `pastoral_journal_submitted` → Opens journal, notifies zone leader
- `pastoral_journal_forwarded` → Opens journal, notifies pastors
- `pastoral_journal_confirmed` → Opens journal, notifies original author

**Edge Function** (`supabase/functions/handle-pastoral-journal-change/`):
```typescript
// Expects: { journal_id, old_status, new_status }
// Sends appropriate notifications based on transition
```

### Figma References
- Pastoral Journal UI: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=...

### Related Files

**Source Files**:
- `src/features/pastoral/hooks/usePastoralJournals.ts` - List fetching
- `src/features/pastoral/hooks/useCreatePastoralJournal.ts` - Creation
- `src/features/pastoral/hooks/useUpdatePastoralJournalStatus.ts` - Status updates
- `src/features/pastoral/hooks/usePastoralJournalComments.ts` - Comments fetching
- `src/features/pastoral/hooks/useAddPastoralJournalComment.ts` - Comment creation
- `src/features/pastoral/components/PastoralJournalList.tsx` - List component
- `src/features/pastoral/components/PastoralJournalDetail.tsx` - Detail component
- `src/features/pastoral/components/CreatePastoralJournalForm.tsx` - Creation form
- `app/(tabs)/pastoral.tsx` - Main tab screen
- `app/pastoral/[id].tsx` - Detail screen (deep link target)
- `app/pastoral/create.tsx` - Creation screen

**Test Files**:
- `src/features/pastoral/hooks/__tests__/*.test.ts` - Unit tests
- `__tests__/integration/pastoral-journal-rls.test.ts` - Integration tests
- `e2e/pastoral-journal.test.ts` - E2E tests

**Documentation**:
- `claude_docs/20_pastoral_journal.md` - SDD specification
- `locales/en/pastoral.json` - English translations
- `locales/ko/pastoral.json` - Korean translations

---

## Lessons Learned: Settings Feature

### Overview

**What is Settings?**
Settings is a comprehensive profile and preferences management screen allowing users to manage their display name, profile photo, language/locale, notification preferences, and account deletion. The feature includes immediate UI refresh on locale change and secure account deletion with cascading data removal.

**Key Capabilities**:
- Profile management (display name, photo with effects, email display)
- Locale switching between English and Korean with immediate UI refresh
- Notification preferences toggle (messages, prayers, journals, system)
- Account deletion with cascading data removal across all tables
- Profile photo upload with 5 MB limit and image type restrictions
- Full i18n support for all user-facing strings

### Database Schema

**users table** (profile-related columns):
```sql
id                  UUID PRIMARY KEY
tenant_id           UUID  -- Tenant ownership
display_name        TEXT  -- User's preferred display name
photo_url           TEXT  -- URL to profile photo in storage
locale              TEXT  -- 'en' | 'ko' (default 'en')
notification_preferences JSONB  -- { messages, prayers, journals, system }
email               TEXT  -- From auth.users
email_confirmed_at   TIMESTAMP  -- Email verification status
```

**notification_preferences** JSONB schema:
```json
{
  "messages": true,   // Message notifications
  "prayers": true,    // Prayer notifications
  "journals": true,   // Pastoral journal notifications
  "system": true      // System notifications
}
```

**Storage Bucket**:
```sql
-- Bucket: profile-photos
-- File Size Limit: 5 MB (5242880 bytes)
-- Allowed MIME Types: image/jpeg, image/png, image/webp
-- File Path Pattern: {user_id}/{filename}
-- Public Access: Yes (photos are publicly readable)
```

**RLS Policies**:
- Users can only update their own profile (`user_id() = id`)
- Profile photo uploads restricted to user's own folder
- Public read access for all profile photos
- Account deletion requires valid JWT authentication

### Locale Switching Flow

**Implementation Pattern**:
1. User selects language in Settings via LocaleSelector component
2. `handleLocaleChange` calls `changeLocale()` from `useLocale` hook first
3. This updates Zustand preferences store and i18next instance immediately
4. UI refreshes with new language without app restart
5. Then `updateProfile()` saves preference to database for persistence

**useLocale Hook** (`src/hooks/useLocale.ts`):
```typescript
interface LocaleState {
  locale: 'en' | 'ko';
  changeLocale: (newLocale: 'en' | 'ko') => Promise<void>;
}

const { locale, changeLocale } = useLocale();

// Change locale and immediately refresh UI
await changeLocale('ko');
```

**Immediate UI Refresh**:
```typescript
const handleLocaleChange = async (newLocale: 'en' | 'ko') => {
  // First change the i18n locale for immediate UI refresh
  await changeLocale(newLocale);

  // Then update the database for persistence
  const success = await updateProfile({ locale: newLocale });
  if (success && profile) {
    setProfile({ ...profile, locale: newLocale });
  }
};
```

### Hook Interfaces

**useUpdateProfile** (`src/features/settings/hooks/useUpdateProfile.ts`):
```typescript
interface UpdateProfileState {
  updateProfile: (params: UpdateProfileParams) => Promise<boolean>;
  updating: boolean;
  error: Error | null;
}

interface UpdateProfileParams {
  displayName?: string;
  locale?: Locale;
  notificationPreferences?: NotificationPreferences;
}

const { updateProfile, updating, error } = useUpdateProfile();
```

**useUploadProfilePhoto** (`src/features/settings/hooks/useUploadProfilePhoto.ts`):
```typescript
interface UploadProfilePhotoState {
  uploadPhoto: (file: File, onProgress?: (progress: number) => void) => Promise<string | null>;
  uploading: boolean;
  progress: number;
  error: Error | null;
}

// Usage: Selects photo via ImagePicker, uploads to Supabase storage, returns URL
const { uploadPhoto, uploading, progress, error } = useUploadProfilePhoto();
```

**useDeleteAccount** (`src/features/settings/hooks/useDeleteAccount.ts`):
```typescript
interface DeleteAccountState {
  deleteAccount: () => Promise<DeletionResult | null>;
  deleting: boolean;
  error: Error | null;
}

interface DeletionResult {
  success: boolean;
  deletion_counts: {
    storage_photos?: number;
    device_tokens?: number;
    notifications?: number;
    memberships?: number;
    users?: number;
  };
}

const { deleteAccount, deleting, error } = useDeleteAccount();
```

### UI Components

**Settings Components** (`src/features/settings/components/`):

**ProfileSection** (`ProfileSection.tsx`):
```typescript
interface ProfileSectionProps {
  displayName: string | null;
  photoUrl: string | null;
  email: string;
  emailVerified: boolean;
  onDisplayNameChange: (name: string) => Promise<void>;
  onPhotoUploaded: (url: string) => void;
  onPhotoRemoved: () => void;
}

// Displays profile photo with edit button, display name (inline edit), email (read-only with verification badge)
```

**LocaleSelector** (`LocaleSelector.tsx`):
```typescript
interface LocaleSelectorProps {
  value: 'en' | 'ko';
  onChange: (locale: 'en' | 'ko') => Promise<void>;
}

// Switch component toggling between English and Korean
// Calls onChange immediately on toggle
```

**NotificationPreferences** (`NotificationPreferences.tsx`):
```typescript
interface NotificationPreferencesProps {
  value: NotificationPreferences;
  onChange: (preferences: NotificationPreferences) => Promise<void>;
}

// Four toggle switches for messages, prayers, journals, system
// Auto-saves on each toggle change
```

**AccountDeletionButton** (`AccountDeletionButton.tsx`):
```typescript
interface AccountDeletionButtonProps {
  // No props - uses hooks internally
}

// Danger-styled button with AlertDialog confirmation
// Shows loading state during deletion
// Redirects to login after successful deletion
```

### Translation Keys

**Settings Keys** (`settings.json`):
```json
{
  "settings": "Settings" / "설정",
  "account": "Account" / "계정",
  "profile": "Profile" / "프로필",
  "display_name": "Display Name" / "표시 이름",
  "avatar": "Avatar" / "프로필 사진",
  "change_avatar": "Change Avatar" / "프로필 사진 변경",
  "upload_photo": "Upload Photo" / "사진 업로드",
  "remove_photo": "Remove Photo" / "사진 제거",
  "photo_intensity": "Character Effect" / "캐릭터 효과",
  "notifications": "Notifications" / "알림",
  "message_notifications": "Messages" / "메시지",
  "prayer_notifications": "Prayers" / "기도",
  "journal_notifications": "Journals" / "목회 일지",
  "system_notifications": "System" / "시스템",
  "language": "Language" / "언어",
  "select_language": "Select Language" / "언어 선택",
  "english": "English",
  "korean": "한국어",
  "delete_account": "Delete Account" / "계정 삭제",
  "delete_account_warning": "This action cannot be undone. All your data will be permanently deleted.",
  "delete_account_confirm_title": "Delete Account?",
  "delete_account_confirm_message": "Are you sure you want to delete your account? This will permanently delete all your data including messages, prayers, journals, and memberships. This action cannot be undone.",
  "deleting_account": "Deleting account..." / "계정 삭제 중...",
  "email": "Email" / "이메일",
  "email_verified": "Verified" / "인증됨",
  "email_unverified": "Unverified" / "미인증",
  "locale_changed": "Language changed" / "언어가 변경되었습니다",
  "notification_preferences_updated": "Notification preferences updated" / "알림 설정이 업데이트되었습니다"
}
```

### Account Deletion Flow

**Edge Function** (`supabase/functions/delete-user-account/`):
```typescript
// Request: POST with Bearer token (JWT)
// Response: { success: boolean, deletion_counts: {...} }

// Cascade order (important for referential integrity):
// 1. Delete profile photos from storage (profile-photos bucket)
// 2. Delete device_tokens rows
// 3. Delete notifications rows
// 4. Delete memberships rows (cascades to dependent tables)
// 5. Delete auth.user record
// 6. Clear session and redirect to login
```

**Tables Affected by Cascade**:
- `storage.objects` (profile-photos bucket)
- `device_tokens`
- `notifications`
- `memberships` (cascades to: event_chat_exclusions, message_recipients, pastoral_journals, pastoral_journal_comments, prayer_card_recipients, prayer_cards)
- `auth.users`
- `users`

**Security**:
- Requires valid JWT authentication
- Verifies `user_id()` matches requested user ID
- Cross-user deletion blocked
- Cascade order ensures referential integrity

### Key Implementation Gotchas

**Locale Change Order Matters**:
```typescript
// WRONG - Update DB first, then UI (delayed refresh)
const success = await updateProfile({ locale: newLocale });
await changeLocale(newLocale);

// CORRECT - Change UI first, then persist to DB
await changeLocale(newLocale);  // Immediate UI refresh
const success = await updateProfile({ locale: newLocale });  // Persist
```

**Profile Photo Upload Path**:
```typescript
// Store photos in user-specific folder for RLS
const filePath = `${userId}/${fileName}`;
// Results in: profile-photos/{user_id}/photo.jpg
// RLS policy: auth.uid()::text = (storage.foldername(name))[1]
```

**File Size Validation**:
```typescript
// Validate BEFORE upload (client-side)
const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5 MB
if (file.size > MAX_FILE_SIZE) {
  throw new Error('File size exceeds 5 MB limit');
}
// Edge Function also validates, but client check is faster UX
```

**Notification Preferences Update**:
```typescript
// Always merge with existing preferences when updating
const updatedPreferences = {
  ...currentPreferences,
  ...newPreferences  // Only update specified keys
};
```

### Testing

**Unit Tests** (`src/features/settings/hooks/__tests__/`):
- `useUpdateProfile.test.ts` - Display name, locale, notification preferences updates
- `useUploadProfilePhoto.test.ts` - File selection, upload progress, size validation
- `useDeleteAccount.test.ts` - Deletion flow, error handling

**Integration Tests** (`__tests__/integration/settings-profile.test.ts`):
- Profile update RLS enforcement (users can only update own profile)
- Notification preferences persistence
- Storage bucket access control (upload to own folder, public read)
- Account deletion cascade verification
- Cross-tenant isolation enforcement

**E2E Tests** (`e2e/settings.test.ts`):
- Navigate to Settings from Home
- Edit display name and verify save
- Upload profile photo with mocked picker
- Apply photo effects at each intensity level (0%, 30%, 60%, 100%)
- Switch locale and verify UI language change
- Toggle each notification preference
- Logout and verify redirect
- Delete account with confirmation and verify removal

**Test IDs**:
- `settings-screen` - Main settings container
- `profile-section` - Profile section container
- `display-name-input` - Inline edit input for display name
- `photo-upload-button` - Photo upload button
- `photo-remove-button` - Photo remove button
- `locale-selector` - Language toggle switch
- `notification-messages` - Messages notification toggle
- `notification-prayers` - Prayers notification toggle
- `notification-journals` - Journals notification toggle
- `notification-system` - System notification toggle
- `logout-button` - Logout button
- `delete-account-button` - Delete account button
- `delete-account-confirm-dialog` - Confirmation alert dialog
- `delete-account-confirm-button` - Confirm deletion button

### Common Patterns

**Updating Display Name**:
```typescript
const { updateProfile } = useUpdateProfile();

const handleDisplayNameChange = async (name: string) => {
  const success = await updateProfile({ displayName: name });
  if (success && profile) {
    setProfile({ ...profile, display_name: name });
  }
};
```

**Uploading Profile Photo**:
```typescript
const { uploadPhoto, uploading } = useUploadProfilePhoto();

const handlePhotoSelect = async () => {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled) {
    const url = await uploadPhoto(result.assets[0]);
    if (url) {
      setProfile({ ...profile, photo_url: url });
    }
  }
};
```

**Deleting Account**:
```typescript
const { deleteAccount, deleting } = useDeleteAccount();
const router = useRouter();

const handleDeleteAccount = async () => {
  const result = await deleteAccount();
  if (result?.success) {
    router.replace('/(auth)/login');
  }
};
```

### Photo Effects Feature

**Character Overlay** (future enhancement):
- Intensity levels: 0%, 30%, 60%, 100%
- Slider control in ProfileSection
- Effect applied client-side using ImageManipulator
- Processed image uploaded to storage

**Implementation Pattern**:
```typescript
import * as ImageManipulator from 'expo-image-manipulator';

const applyPhotoEffect = async (uri: string, intensity: number) => {
  // intensity: 0 | 30 | 60 | 100
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [],  // No crop/resize
    {
      compress: 0.8,
      format: SaveFormat.JPEG,
    }
  );
  // Apply character overlay based on intensity
  // Upload processed image
};
```

### Figma References
- Settings Screen Design: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=221-30543

### Related Files

**Source Files**:
- `app/(tabs)/settings.tsx` - Main settings screen
- `src/features/settings/components/ProfileSection.tsx` - Profile section
- `src/features/settings/components/LocaleSelector.tsx` - Language selector
- `src/features/settings/components/NotificationPreferences.tsx` - Notification toggles
- `src/features/settings/components/AccountDeletionButton.tsx` - Account deletion
- `src/features/settings/hooks/useUpdateProfile.ts` - Profile updates
- `src/features/settings/hooks/useUploadProfilePhoto.ts` - Photo upload
- `src/features/settings/hooks/useDeleteAccount.ts` - Account deletion

**Test Files**:
- `src/features/settings/hooks/__tests__/*.test.ts` - Unit tests
- `__tests__/integration/settings-profile.test.ts` - Integration tests
- `e2e/settings.test.ts` - E2E tests

**Documentation**:
- `claude_docs/21_settings.md` - SDD specification
- `locales/en/settings.json` - English translations
- `locales/ko/settings.json` - Korean translations

**Edge Functions**:
- `supabase/functions/delete-user-account/index.ts` - Account deletion
