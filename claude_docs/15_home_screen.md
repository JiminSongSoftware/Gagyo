---
tags: [sdd, home-screen, navigation, dashboard, tabs]
---

# 15 Home Screen & Tab Navigation

## WHAT

The Home screen serves as the primary navigation hub for authenticated users within a tenant context. It provides:

1. **Tab Navigation**: A bottom tab bar with 6 tabs - Home, Chat, Prayer, Pastoral Journal, Images, and Settings
2. **Dashboard Layout**: The Home tab displays a dashboard with quick-access widgets showing:
   - Recent Conversations summary
   - Prayer Cards summary
   - Pastoral Journal status
3. **Quick Actions**: Shortcut buttons to start common tasks (new conversation, create prayer card, write journal entry)
4. **Tenant Context Display**: Welcome message showing the active church/tenant name

### Screen Structure

```
┌─────────────────────────────────────┐
│ Welcome to [Church Name]            │
│─────────────────────────────────────│
│ Dashboard                           │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Recent Conversations            │ │
│ │ [Empty state or list preview]   │ │
│ │                    [View All →] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Prayer Cards                    │ │
│ │ [Empty state or summary]        │ │
│ │                    [View All →] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Pastoral Journal                │ │
│ │ [Status or summary]             │ │
│ │                    [View All →] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Quick Actions                       │
│ [Start Conversation]                │
│ [Create Prayer Card]                │
│ [Write Journal Entry]               │
│                                     │
├─────────────────────────────────────┤
│ [Home] [Chat] [Prayer] [Pastoral]   │
│                    [Images] [Settings] │
└─────────────────────────────────────┘
```

### Tab Navigation Structure

| Tab Index | Name     | Route            | Icon (Ionicons) | i18n Key            |
|-----------|----------|------------------|-----------------|---------------------|
| 0         | Home     | `(tabs)/index`   | `home`          | `common.nav.home`   |
| 1         | Chat     | `(tabs)/chat`    | `chatbubbles`   | `common.nav.chat`   |
| 2         | Prayer   | `(tabs)/prayer`  | `heart`         | `common.nav.prayer` |
| 3         | Pastoral | `(tabs)/pastoral`| `book`          | `common.nav.pastoral`|
| 4         | Images   | `(tabs)/images`  | `images`        | `common.nav.images` |
| 5         | Settings | `(tabs)/settings`| `settings`      | `common.nav.settings`|

---

## WHY

### Dashboard Layout Rationale

1. **Quick Access to Key Features**: Users need a central hub to see activity across all major features without navigating to each section
2. **Contextual Awareness**: Displaying the tenant name reinforces multi-tenant context and helps users with multiple church memberships confirm they're in the correct context
3. **Progressive Disclosure**: Empty states guide new users while summaries provide value to active users

### Tab-Based Navigation Rationale

1. **Mobile-First UX Pattern**: Bottom tab navigation is the standard iOS/Android pattern for primary navigation
2. **Direct Access**: All core features are one tap away from any screen
3. **Visual Hierarchy**: Home tab as the default landing establishes the dashboard as the central hub

### Navigation Guards Rationale

1. **Security**: Prevent access to tenant-scoped data without proper tenant context
2. **UX Consistency**: Ensure users always have valid context before viewing tenant data
3. **Multi-Tenant Isolation**: Enforce tenant boundaries at the navigation level, not just API level

---

## HOW

### Implementation Approach

#### 1. Tab Navigation (`app/(tabs)/_layout.tsx`)

- Use Expo Router's `Tabs` component with 6 `Tabs.Screen` children
- Apply `useTranslation()` hook for i18n tab labels
- Use Ionicons for tab icons with consistent sizing
- Apply theme colors via `useColorScheme()` hook
- Auth guard already exists in parent `app/_layout.tsx` - no changes needed there

```typescript
// Tab configuration pattern
<Tabs.Screen
  name="chat"
  options={{
    title: t('common.nav.chat'),
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="chatbubbles" size={size} color={color} />
    ),
  }}
/>
```

#### 2. Dashboard Widgets (`src/components/home/DashboardWidget.tsx`)

- Create reusable `DashboardWidget` component extending `Card`
- Props: `titleKey` (i18n), `isEmpty`, `emptyStateKey` (i18n), `onViewAll`, `children`
- All text uses i18n via `i18nKey` props
- Widget supports both empty and populated states

```typescript
interface DashboardWidgetProps {
  titleKey: string;       // e.g., 'common.home.recent_conversations'
  isEmpty?: boolean;
  emptyStateKey?: string; // e.g., 'common.home.no_recent_activity'
  onViewAll?: () => void;
  children?: React.ReactNode;
}
```

#### 3. Home Screen (`app/(tabs)/index.tsx`)

- Use `useRequireAuth()` hook to ensure auth + tenant context
- Use `useTenantContext()` to get `activeTenantName` for welcome message
- Render dashboard title with tenant name interpolation
- Render 3 `DashboardWidget` components (empty states initially)
- Render Quick Actions section with 3 navigation buttons
- Use `ScrollView` for vertical scrolling when content overflows

#### 4. Placeholder Tab Screens

Each placeholder screen follows this pattern:
- Import `Container`, `Heading` from UI components
- Use `useRequireAuth()` for consistent auth enforcement
- Render with `testID` for E2E tests
- Display i18n heading

### Data Model Touchpoints

- **Tenant Context**: `useTenantContext()` from `@/stores/tenantStore`
- **Auth Context**: `useRequireAuth()` from `@/hooks/useAuthGuard`
- No new database queries in initial implementation (widgets show empty states)

### API Boundaries

No new API endpoints required. Existing auth and tenant context hooks provide all needed data.

### Navigation Guards

The existing guard in `app/_layout.tsx` handles:
- Redirect to login if no user
- Redirect to tenant selection if user but no tenant
- Allow access to tabs only with valid user + tenant context

No additional guards needed in tab screens - the layout-level guard ensures valid context.

---

## Figma References

- **Home Screen Dashboard**: `node-id=38-643`
- **Dashboard Flow**: `node-id=128-1255`
- **Tab Navigation Icons**: Standard Ionicons (not custom Figma assets)

---

## Test Implications

### E2E Tests (`e2e/home-navigation.test.ts`)

| Scenario | Expected Behavior |
|----------|-------------------|
| Display home screen after authentication | Home screen visible with dashboard title |
| Show all navigation tabs | All 6 tabs visible with correct labels |
| Navigate to chat tab | Chat screen renders on tap |
| Navigate to prayer tab | Prayer screen renders on tap |
| Navigate to pastoral tab | Pastoral screen renders on tap |
| Navigate to images tab | Images screen renders on tap |
| Navigate to settings tab | Settings screen renders on tap |
| Display dashboard widgets | All 3 widgets visible with testIDs |
| Show tenant name in welcome | Welcome message contains tenant name |
| Korean locale navigation | Tab labels display in Korean |
| Tenant context enforcement | Redirect to tenant selection if context cleared |

### Unit Tests

| Component | Test Cases |
|-----------|------------|
| `HomeScreen` | Renders dashboard title, welcome message, widgets, quick actions |
| `DashboardWidget` | Renders title, handles empty state, calls onViewAll callback |

### Integration Tests

No new integration tests required - existing auth context tests cover tenant validation.

---

## i18n Requirements

### New Translation Keys

#### `locales/en/common.json`
```json
{
  "nav": {
    "home": "Home",
    "chat": "Chat",
    "prayer": "Prayer",
    "pastoral": "Pastoral Journal",
    "images": "Images",
    "settings": "Settings"
  },
  "home": {
    "welcome": "Welcome to {{churchName}}",
    "dashboard_title": "Dashboard",
    "recent_conversations": "Recent Conversations",
    "prayer_summary": "Prayer Cards",
    "pastoral_status": "Pastoral Journal",
    "view_all": "View All",
    "no_recent_activity": "No recent activity",
    "quick_actions": "Quick Actions",
    "start_conversation": "Start Conversation",
    "create_prayer": "Create Prayer Card",
    "write_journal": "Write Journal Entry"
  }
}
```

#### `locales/ko/common.json`
```json
{
  "nav": {
    "home": "홈",
    "chat": "채팅",
    "prayer": "기도",
    "pastoral": "목회 일지",
    "images": "이미지",
    "settings": "설정"
  },
  "home": {
    "welcome": "{{churchName}}에 오신 것을 환영합니다",
    "dashboard_title": "대시보드",
    "recent_conversations": "최근 대화",
    "prayer_summary": "기도 카드",
    "pastoral_status": "목회 일지",
    "view_all": "전체 보기",
    "no_recent_activity": "최근 활동 없음",
    "quick_actions": "빠른 작업",
    "start_conversation": "대화 시작",
    "create_prayer": "기도 카드 작성",
    "write_journal": "일지 작성"
  }
}
```

---

## Implementation Status

- [ ] SDD Specification (this document)
- [ ] Translation keys added (en/ko)
- [ ] E2E tests created
- [ ] Unit tests created
- [ ] Tab navigation implemented
- [ ] DashboardWidget component created
- [ ] Home screen dashboard implemented
- [ ] Tests passing
- [ ] Documentation updated
