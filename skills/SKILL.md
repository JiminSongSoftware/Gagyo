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
