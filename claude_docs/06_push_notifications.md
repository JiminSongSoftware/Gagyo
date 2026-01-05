---
tags: [push, notifications, expo, tokens, security, deep-linking]
---

# 06 Push Notifications

## WHAT
Push notification flows: register token, store token, send push, handle opens and navigation with deep linking.

## WHY
- Token lifecycle correctness is required for reliability and privacy
- Tenant scoping must prevent cross-tenant notification leaks
- Deep linking ensures users land on the correct screen within tenant context
- Timely delivery of critical events (messages, mentions, prayer updates, pastoral workflows)

## HOW

### Token Lifecycle

#### Register (On App Launch / After Tenant Selection)
1. App requests push notification permissions using Expo Notifications
2. User grants permission (iOS: system prompt, Android: granted at install)
3. Expo Notifications provides device token (ExponentPushToken[xxx])
4. Token sent to backend with:
   - `tenant_id`: Current active tenant
   - `user_id`: Authenticated user ID
   - `token`: Expo push token
   - `platform`: 'ios' | 'android'
5. Backend stores/updates token in `device_tokens` table with upsert semantics
6. On permission denial, log the event but don't block app functionality

**i18n Requirements:**
- Permission request message must be localized: Use `useI18n()` hook
- English: "Receive notifications for messages, prayer updates, and pastoral care requests"
- Korean: "메시지, 기도 응답, 목양 관련 알림을 받으시겠습니까?"

#### Rotate (On App Launch)
1. Compare current Expo token with stored token for active tenant
2. If changed (tokens differ):
   - Upsert new token in `device_tokens`
   - Old token automatically invalidated by upsert (UNIQUE constraint on tenant_id, token)
3. Update `last_used_at` timestamp
4. Handle token rotation failure gracefully (log error, retry on next launch)

#### Invalidate
- **On logout**: Mark token as revoked (`revoked_at = NOW()`) for current tenant
- **On tenant switch**: No action needed (token is tenant-scoped, new tenant will have separate tokens)
- **On failed delivery** (invalid token response from Expo): Remove token from database

### Tenant Scoping

#### Storage Model
```sql
device_tokens:
  id: uuid (PK)
  tenant_id: uuid (required, FK to tenants)
  user_id: uuid (required, FK to users)
  token: text (Expo push token)
  platform: 'ios' | 'android'
  last_used_at: timestamptz
  created_at: timestamptz
  revoked_at: timestamptz (nullable)

UNIQUE(tenant_id, token) -- Same token can exist in different tenants
```

#### RLS Enforcement
- Users can only view their own tokens within active tenant memberships
- Users can only insert tokens for tenants where they have active membership
- Service role required for cross-user queries (Edge Functions only)
- Push notifications only sent to tokens matching target tenant_id

### Notification Triggers

#### New Message
- **Recipients**: All conversation participants except sender
- **Event Chat**: Respects `event_chat_exclusions` table (excluded users don't receive push)
- **Payload**:
  - `type`: 'new_message'
  - `title`: Sender display name
  - `body`: Message preview (truncated to 100 chars) or "[Attachment]" for media
  - `data`: { conversation_id, tenant_id, message_id (for thread navigation) }
- **i18n keys**:
  - Title: `notifications.new_message.title` → "{senderName}"
  - Body: `notifications.new_message.body` → "{contentPreview}"

#### Mention
- **Recipients**: Only mentioned user
- **Higher priority**: Use Expo priority 'high'
- **Payload**:
  - `type`: 'mention'
  - `title`: "Mentioned by {senderName}" / "{senderName}님이 멘션함"
  - `body`: Message content
  - `data`: { conversation_id, tenant_id, message_id }
- **i18n keys**:
  - Title: `notifications.mention.title` → "Mentioned by {senderName}" / "{senderName}님이 멘션함"
  - Body: `notifications.mention.body` → "{content}"

#### Prayer Answered
- **Recipients**: All recipients of prayer card based on scope (individual, small_group, church_wide)
- **Style**: Celebratory notification with custom sound (future)
- **Payload**:
  - `type`: 'prayer_answered'
  - `title`: "Prayer Answered 🎉" / "기도 응답 🎉"
  - `body`: "{authorName}'s prayer has been answered" / "{authorName}님의 기도가 응답되었습니다"
  - `data`: { prayer_card_id, tenant_id }
- **i18n keys**:
  - Title: `notifications.prayer_answered.title` → "Prayer Answered 🎉" / "기도 응답 🎉"
  - Body: `notifications.prayer_answered.body` → "{authorName}'s prayer has been answered"

#### Pastoral Journal Workflow

##### Submitted (draft → submitted)
- **Recipients**: Zone leader for the small group's zone
- **Payload**:
  - `type`: 'pastoral_journal_submitted'
  - `title`: "Pastoral Journal Submitted" / "목양 일지 제출"
  - `body**: "{leaderName} submitted a journal for {groupName}" / "{groupName} {leaderName} 목장이 목양 일지를 제출했습니다"
  - `data`: { journal_id, tenant_id, small_group_id }

##### Forwarded (submitted → zone_reviewed)
- **Recipients**: All pastors in tenant
- **Payload**:
  - `type`: 'pastoral_journal_forwarded'
  - `title`: "Journal Ready for Review" / "목양 일지 검토 대기"
  - `body**: "{zoneLeaderName} forwarded {groupName}'s journal" / "{zoneLeaderName} 지도자가 {groupName}의 일지를 전달했습니다"
  - `data`: { journal_id, tenant_id, small_group_id }

##### Confirmed (zone_reviewed → pastor_confirmed)
- **Recipients**: Original author (small group leader)
- **Payload**:
  - `type`: 'pastoral_journal_confirmed'
  - `title`: "Pastoral Journal Confirmed ✝️" / "목양 일지 확정 ✝️"
  - `body**: "Pastor has reviewed your journal" / "목사님이 목양 일지를 검토했습니다"
  - `data`: { journal_id, tenant_id, small_group_id }

### Deep Linking

#### URL Scheme
```
gagyo:///{screen}/{id}?{params}
```

#### Navigation Targets
| Notification Type | Route | Example |
|-------------------|-------|---------|
| new_message | `/chat/[conversationId]` | `gagyo:///chat/abc-123` |
| mention | `/chat/[conversationId]?messageId=xyz` | `gagyo:///chat/abc-123?messageId=xyz-789` |
| prayer_answered | `/prayer/[prayerCardId]` | `gagyo:///prayer/def-456` |
| pastoral_journal_* | `/pastoral/[journalId]` | `gagyo:///pastoral/ghi-789` |

#### Tenant Context Handling
1. Extract `tenant_id` from notification data payload
2. Verify user has active membership in tenant
3. Switch tenant context before navigation
4. Navigate to target screen using Expo Router
5. Handle invalid tenant (membership inactive): Show error and navigate to home

#### Cold Start Flow
1. User taps notification while app is not running
2. App launches, `Notifications.getInitialNotification()` returns notification
3. Parse notification data, switch tenant, navigate to target
4. If tenant switch requires auth, show login first

#### Background/Active App Flow
1. User taps notification while app is backgrounded
2. `Notifications.addNotificationReceivedListener` fires
3. Parse notification data, switch tenant if needed, navigate to target
4. If app is active, show in-app notification banner (toast)

### Delivery Strategy

#### Batching
- Group messages in batches of 100 (Exto SDK limit)
- Use `Expo.sendPushNotificationsAsync()` for batch sending
- Process batches sequentially to avoid overwhelming Expo service

#### Error Handling
- **Invalid tokens**: Remove from `device_tokens` table, log event
- **Rate limiting**: Enforce 1000 requests/minute per tenant
- **Transient failures**: Exponential backoff (1s, 2s, 4s), max 3 retries
- **Permanent failures**: Log to Sentry for investigation

#### Logging
```typescript
interface PushNotificationLog {
  id: uuid;
  tenant_id: uuid;
  notification_type: NotificationType;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  error_summary: jsonb; // { token_ids: [], errors: [] }
  created_at: timestamptz;
}
```

### Environment Separation

#### Development
- Use Expo push notification sandbox (`Expo.isExpoGo()` or dev builds)
- Separate token storage per dev tenant
- Console logging for all notification events
- Test with Expo Go app

#### Staging
- Production-like setup with staging Expo project
- Test with real devices (TestFlight / internal Android distribution)
- Monitor delivery rates via Supabase logs

#### Production
- Production Expo credentials (configured in app.config.js)
- Sentry error tracking for failures
- PostHog analytics for notification engagement (tap-through rate)
- Rate limiting strictly enforced

### Security Considerations

#### Token Storage
- Tokens stored with tenant_id for isolation
- RLS policies prevent cross-tenant access
- Service role required for bulk token queries

#### Payload Validation
- All notification payloads validated before sending
- Deep link URLs sanitized to prevent injection
- Tenant membership verified before sending

#### Rate Limiting
- Per-tenant rate limit: 1000 push sends/minute
- Per-user rate limit: 10 notifications/minute
- Burst detection: Automatically throttle abusive patterns

### Figma References
- Notification UI components: `Figma_Screenshots/notifications/`
- In-app notification banner: See design system "Toast" component
- Settings toggle: Notification preferences in user settings screen

### Test Implications

#### Unit Tests
**File**: `src/features/notifications/__tests__/useDeviceToken.test.ts`
- Token registration flow (permission granted/denied)
- Token rotation detection and update
- Token invalidation on logout
- Payload builder produces correct platform-specific format
- Deep link parser extracts correct navigation params

#### Integration Tests
**File**: `__tests__/integration/device-token-management.test.ts`
- Token registration stores correctly with tenant_id
- Token rotation updates existing record (same tenant_id, token)
- RLS prevents cross-tenant token access
- User can only query their own tokens
- Token upsert handles duplicate tokens correctly

#### E2E Tests
**File**: `e2e/push-notifications.test.ts`
- Full flow: message sent → push received → tap → navigate
- Prayer answered notification → tap → navigate to prayer card
- Pastoral journal notifications at each workflow stage
- Tenant switch notification handling
- Cold start notification handling
- Event Chat exclusion verification

#### Edge Function Tests
**File**: `supabase/functions/send-push-notification/send-push-notification.test.ts`
- Batching logic (groups of 100)
- Expired token removal
- Rate limiting enforcement
- Error responses (400, 401, 429, 500)
- Tenant isolation in token queries
