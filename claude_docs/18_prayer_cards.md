---
tags: [architecture, prayer, prayer-cards, analytics, notifications]
---

# 18 Prayer Cards

## WHAT
Prayer cards are prayer requests that can be shared with individuals, small groups, or the entire church. The feature includes creation, filtering, viewing details, marking as answered with notifications, analytics across scopes, and optional background music.

## WHY
- Prayer is core to church community life; needs predictable model + tests.
- Multi-recipient scope (individual/small_group/church_wide) introduces visibility complexity (high risk for tenant/role leakage).
- Answered notifications celebrate God's faithfulness and encourage community engagement.
- Analytics provide insights into prayer life at individual, group, and church levels.

## HOW

### Prayer Card Model

#### Recipient Scopes
- **Church-wide**: Visible to all tenant members
- **Small Group**: Visible only to members of specified small group(s)
- **Individual**: Visible only to specified recipient membership(s)

#### Schema Fields

```sql
prayer_cards:
  id: uuid (PK)
  tenant_id: uuid (required, FK -> tenants)
  author_id: uuid (required, FK -> memberships)
  content: text (required)
  recipient_scope: enum ('individual', 'small_group', 'church_wide')
  answered: boolean (default false)
  answered_at: timestamptz (nullable)
  created_at: timestamptz
  updated_at: timestamptz

prayer_card_recipients:
  id: uuid (PK)
  prayer_card_id: uuid (FK -> prayer_cards)
  recipient_membership_id: uuid (nullable, FK -> memberships)
  recipient_small_group_id: uuid (nullable, FK -> small_groups)
  created_at: timestamptz
```

### Visibility Rules (RLS)

#### prayer_cards Table
Users can view prayer cards where:
1. They are the author
2. `recipient_scope = 'church_wide'` AND same `tenant_id`
3. `recipient_scope = 'individual'` AND their `membership_id` is in `prayer_card_recipients`
4. `recipient_scope = 'small_group'` AND their `small_group_id` is in `prayer_card_recipients`

#### prayer_card_recipients Table
Users can view recipients for prayer cards they can access (same visibility as parent prayer card).

### Creation Flow

#### UI Components
- **FAB**: Floating action button to open creation modal
- **CreatePrayerCardModal**: Bottom sheet with:
  - Content text input (multiline, required)
  - Recipient scope selector (individual/small_group/church_wide)
  - Recipient picker (multi-select for individual/small_group scopes)
  - Submit button (enabled when content + scope valid)
  - Cancel/close button

#### Validation Rules
| Rule | Description | Enforcement Level |
|------|-------------|-------------------|
| **Content required** | Cannot be empty or whitespace only | Client + Database |
| **Scope required** | Must select one of three scopes | Client + Database |
| **Recipients required** | Individual/small_group scopes require at least one recipient | Client + Database |
| **Tenant membership** | User must have active membership to create | RLS |

#### API Contract
```typescript
// Create prayer card
{
  tenant_id: uuid,
  author_id: uuid,  // From current user's membership
  content: string,
  recipient_scope: 'individual' | 'small_group' | 'church_wide',
  recipients?: Array<{
    recipient_membership_id?: uuid,
    recipient_small_group_id?: uuid
  }>
}
```

### Filtering

#### Filter Tabs
- **My Prayers**: Shows prayer cards where user is the author
- **Received Prayers**: Shows prayer cards addressed to user (individual or their small group)
- **All Prayers**: Shows all prayer cards user can see (author + received)

#### Query Patterns

```typescript
// My Prayers
supabase
  .from('prayer_cards')
  .select('*')
  .eq('author_id', membershipId)

// Received Prayers (individual)
supabase
  .from('prayer_card_recipients')
  .select('prayer_cards(*)')
  .eq('recipient_membership_id', membershipId)

// Received Prayers (small group)
supabase
  .from('prayer_card_recipients')
  .select('prayer_cards(*)')
  .eq('recipient_small_group_id', smallGroupId)

// All Prayers (union of author + received)
// Combined client-side or via view
```

### Prayer Detail View

#### Components
- **Author info**: Display name, avatar
- **Content**: Multi-line text display
- **Recipients**: List of who can see the prayer (for individual/small_group)
- **Answered status**: Badge showing answered/unanswered
- **Mark as Answered button**: Visible to author and recipients
- **Answered timestamp**: Shows when prayer was marked answered
- **Created date**: Relative time (Today, Yesterday, or date)

#### Mark as Answered Flow
1. User taps "Mark as Answered" button
2. Confirm dialog (optional, can be direct)
3. Update `answered = true`, `answered_at = now()`
4. Send push notifications to all recipients
5. Update UI to show answered badge

### Answered Notifications

#### Trigger
When `answered` changes from `false` to `true` on a prayer card.

#### Notification Payload
```typescript
{
  type: 'prayer_answered',
  tenant_id: uuid,
  prayer_card_id: uuid,
  author_id: uuid,
  author_name: string,
  content_preview: string,  // First 100 chars
  answered_at: string  // ISO timestamp
}
```

#### Recipients
- All recipients in `prayer_card_recipients` for that prayer card
- Plus the original author (if not already in recipients)

#### Push Notification Format
- **Title**: "Prayer Answered" / "기도 응답"
- **Body**: "{Author} marked a prayer as answered: {Content preview}"
- **Deep Link**: `/prayer/{prayer_cardId}`
- **Sound**: Celebration/chime sound

### Prayer Analytics

#### Scopes
- **Individual**: Stats for prayers user authored
- **Small Group**: Stats for prayers addressed to user's small group
- **Church-wide**: Stats for all church-wide prayers

#### Time Periods
- **Weekly**: Last 7 days
- **Monthly**: Last 30 days
- **Quarterly**: Last 90 days
- **Semi-annual**: Last 6 months
- **Annual**: Last 12 months

#### Metrics
- **Total Prayers**: Count of prayer cards in scope/period
- **Answered Prayers**: Count where `answered = true`
- **Answer Rate**: `(Answered / Total) * 100` percentage

#### Analytics UI
- Bottom sheet that slides up from screen
- Scope selector (individual/small_group/church_wide)
- Period selector (weekly/monthly/quarterly/semi-annual/annual)
- Stat cards showing totals, answered count, answer rate
- Optional: Chart showing trend over periods

#### Query Patterns
```typescript
// Individual scope
supabase
  .from('prayer_cards')
  .select('id, answered, created_at')
  .eq('tenant_id', tenantId)
  .eq('author_id', membershipId)
  .gte('created_at', startDate)
  .lte('created_at', endDate)

// Small group scope
supabase
  .from('prayer_card_recipients')
  .select('prayer_cards!inner(id, answered, created_at)')
  .eq('prayer_cards.tenant_id', tenantId)
  .eq('recipient_small_group_id', smallGroupId)
  .gte('prayer_cards.created_at', startDate)
  .lte('prayer_cards.created_at', endDate)

// Church-wide scope
supabase
  .from('prayer_cards')
  .select('id, answered, created_at')
  .eq('tenant_id', tenantId)
  .eq('recipient_scope', 'church_wide')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
```

### Background Music

#### Feature Requirements
Optional ambient music that plays while user is on prayer screen for those who find it helpful for focus and prayer.

#### Capabilities
- Toggle on/off via button in header
- Persists preference in AsyncStorage
- Handles app backgrounding (pauses audio)
- Handles interruptions (phone calls, other audio)
- Loops music file continuously
- Gracefully degrades if expo-av not installed

#### Audio File
- Location: `assets/music/prayer-background.mp3`
- Format: MP3
- Style: Gentle, instrumental, loopable ambient music

#### State Management
```typescript
{
  isEnabled: boolean,  // User preference
  isPlaying: boolean,  // Currently playing
  isLoading: boolean,  // Loading state
  error: Error | null
}
```

#### Component
- **BackgroundMusicToggle**: Button in prayer screen header
  - Icon: 🔇 when disabled, 🔊 when enabled
  - Label: "Background Music" / "배경 음악"
  - Accessibility: Proper labels for screen readers

### Real-Time Subscriptions

#### Prayer Card List
Subscribe to new prayer cards and answered status updates:
```typescript
supabase
  .channel('prayer_cards')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'prayer_cards',
    filter: `tenant_id=eq.${tenantId}`
  }, handleNewPrayer)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'prayer_cards',
    filter: `tenant_id=eq.${tenantId}`
  }, handlePrayerUpdate)
  .subscribe()
```

#### Cleanup
Always remove channels on unmount to prevent memory leaks.

### Internationalization (i18n)

#### Translation Keys

| Key | English | Korean |
|-----|---------|--------|
| `prayer.prayer_cards` | Prayer Cards | 기도 카드 |
| `prayer.my_prayers` | My Prayers | 내 기도 |
| `prayer.received_prayers` | Received Prayers | 받은 기도 |
| `prayer.all_prayers` | All Prayers | 모든 기도 |
| `prayer.no_prayers` | No prayers yet | 아직 기도가 없습니다 |
| `prayer.start_praying` | Start by creating a prayer | 기도를 생성하여 시작하세요 |
| `prayer.create_prayer` | Create Prayer | 기도 만들기 |
| `prayer.content_placeholder` | What would you like us to pray for? | 기도 제목을 입력하세요 |
| `prayer.recipient_scope` | Share with | 공유 대상 |
| `prayer.scope_individual` | Individuals | 개인 |
| `prayer.scope_small_group` | Small Group | 셀 그룹 |
| `prayer.scope_church_wide` | Church-wide | 교회 전체 |
| `prayer.select_recipients` | Select recipients | 받는 사람 선택 |
| `prayer.submit` | Share Prayer | 기도 공유 |
| `prayer.answered` | Answered | 응답됨 |
| `prayer.unanswered` | Unanswered | 기도 중 |
| `prayer.mark_answered` | Mark as Answered | 응답됨으로 표시 |
| `prayer.unmark_answered` | Unmark | 응답 표시 취소 |
| `prayer.analytics` | Analytics | 통계 |
| `prayer.background_music` | Background Music | 배경 음악 |
| `prayer.background_music_enabled` | Play background music | 배경 음악 재생 |
| `prayer.background_music_disabled` | Mute background music | 배경 음악 음소거 |
| `prayer.total_prayers` | Total Prayers | 총 기도 |
| `prayer.answered_prayers` | Answered | 응답됨 |
| `prayer.answer_rate` | Answer Rate | 응답률 |
| `prayer.period_weekly` | Weekly | 주간 |
| `prayer.period_monthly` | Monthly | 월간 |
| `prayer.period_quarterly` | Quarterly | 분기별 |
| `prayer.period_semi_annual` | Semi-annual | 반기별 |
| `prayer.period_annual` | Annual | 연간 |
| `prayer.scope_individual` | Individual | 개인 |
| `prayer.scope_small_group` | Small Group | 셀 그룹 |
| `prayer.scope_church_wide` | Church-wide | 교회 전체 |
| `prayer.notification_answered_title` | Prayer Answered | 기도 응답 |
| `prayer.notification_answered_body` | {name} marked a prayer as answered | {name}님이 기도의 응답을 표시했습니다 |

### Test Implications

#### Unit Tests
- `useBackgroundMusic` hook: play/pause/stop, persistence, interruption handling
- `usePrayerCards` hook: filtering by scope, pagination, real-time updates
- `useCreatePrayerCard` hook: validation, error handling, success state
- `usePrayerAnalytics` hook: scope filtering, period calculations, stats computation
- `BackgroundMusicToggle` component: rendering, interactions, accessibility labels
- `CreatePrayerCardModal` component: form validation, scope selection, submission

#### Integration Tests (RLS)
- Church-wide prayers visible to all tenant members
- Small group prayers visible only to group members
- Individual prayers visible only to specified recipients
- Authors can see their own prayer cards
- Cross-tenant access is blocked
- Recipient selection respects RLS policies
- Mark as answered allowed for author and recipients

#### E2E Tests (Detox)
- Prayer list display with filtering
- Prayer card creation flow (all scopes)
- Prayer detail view navigation
- Mark as answered/unmark functionality
- Analytics sheet (scope and period switching)
- Background music toggle
- Pull to refresh
- Pagination (load more on scroll)
- i18n (Korean and English UI)
- Accessibility (screen reader labels)
- Error handling (network failures, validation errors)

### Figma References
- Prayer List: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=124-7327
- Prayer Detail: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=37-173
- Prayer Analytics: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=354-39531

---

## Implementation Guidance

### Prayer List Screen Requirements

#### Component Structure
```
PrayerScreen (app/(tabs)/prayer.tsx)
├── Header
│   ├── Title
│   └── Analytics Button
├── Filter Tabs (My/Received/All)
├── Prayer List (FlatList)
│   └── PrayerCardItem[]
│       ├── Author Avatar
│       ├── Author Name
│       ├── Content Preview
│       ├── Date
│       └── Answered Badge
├── FAB (Create Prayer)
├── CreatePrayerCardModal
└── PrayerAnalyticsSheet
```

#### Query Pattern
```typescript
// Fetch prayer cards for current user with filtering
const { data: prayerCards } = await supabase
  .from('prayer_cards')
  .select(`
    id,
    content,
    answered,
    answered_at,
    created_at,
    recipient_scope,
    author:memberships (
      id,
      user:users (
        id,
        display_name,
        photo_url
      )
    ),
    prayer_card_recipients (
      id,
      recipient_membership_id,
      recipient_small_group_id
    )
  `)
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false })
  .limit(50);
```

#### Pagination Strategy
- Initial load: 25 prayer cards
- Infinite scroll: load 25 more on reaching end
- Messages ordered by `created_at DESC` (newest first)

### Prayer Detail Screen Requirements

#### URL Pattern
- `/prayer/[prayerCardId]` using Expo Router

#### Data Fetching
```typescript
// Fetch single prayer card with details
const { data: prayer } = await supabase
  .from('prayer_cards')
  .select(`
    id,
    content,
    answered,
    answered_at,
    created_at,
    recipient_scope,
    author:memberships (
      id,
      user:users (
        id,
        display_name,
        photo_url
      )
    ),
    prayer_card_recipients (
      id,
      recipient_membership_id,
      recipient_small_group_id,
      recipient_membership:memberships (
        id,
        user:users (
          id,
          display_name
        )
      ),
      recipient_small_group:small_groups (
        id,
        name
      )
    )
  `)
  .eq('id', prayerCardId)
  .single();
```

### Real-Time Subscription Patterns

#### Subscribe to Answered Status Changes
```typescript
const channel = supabase
  .channel(`prayer:${prayerCardId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'prayer_cards',
      filter: `id=eq.${prayerCardId}`,
    },
    (payload) => {
      if (payload.new.answered !== payload.old.answered) {
        onAnsweredStatusChange(payload.new);
      }
    }
  )
  .subscribe();

return () => {
    supabase.removeChannel(channel);
  };
```

### Background Music Implementation

#### Hook Structure
```typescript
// useBackgroundMusic.ts
export function useBackgroundMusic(musicFile?: string | number) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load sound from expo-av Audio
  // Handle play/pause/stop
  // Persist to AsyncStorage
  // Handle interruptions

  return {
    isEnabled,
    isPlaying,
    isLoading,
    toggle: () => void,
    play: () => Promise<void>,
    pause: () => Promise<void>,
    stop: () => Promise<void>,
    setEnabled: (enabled: boolean) => void,
  };
}
```

#### Error Handling
- Gracefully handle missing expo-av dependency
- Show error toast if audio file fails to load
- Auto-retry on playback failure

### Test Implications (Detailed)

#### Unit Tests
- **Prayer list filtering**: Test each filter returns correct results
- **Pagination**: Test loadMore appends results correctly
- **Analytics computation**: Test answer rate calculation
- **Date range helpers**: Test period start/end calculations
- **Background music state**: Test toggle, persistence, interruption handling

#### Integration Tests
- **RLS policy enforcement**: Verify tenant isolation
- **Answered notification**: Verify all recipients receive notification
- **Analytics queries**: Verify correct counts for each scope
- **Recipient visibility**: Verify individual/small_group scoping

#### E2E Tests (Detox)
1. **View prayer list**
   - Navigate to prayer tab
   - Assert list visible
   - Assert filter tabs visible

2. **Create prayer card**
   - Tap FAB
   - Type content
   - Select scope
   - Tap submit
   - Assert prayer appears in list

3. **Filter prayers**
   - Tap each filter tab
   - Assert correct prayers shown

4. **View prayer detail**
   - Tap prayer card
   - Assert detail screen opens
   - Assert content visible

5. **Mark as answered**
   - Tap mark answered button
   - Assert badge changes
   - Assert timestamp visible

6. **View analytics**
   - Tap analytics button
   - Assert sheet opens
   - Switch scopes and periods
   - Assert stats update

7. **Toggle background music**
   - Tap music toggle
   - Assert icon changes
   - Verify preference persists
