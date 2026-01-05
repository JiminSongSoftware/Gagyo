---
tags: [push, notifications, expo, tokens, security]
---

# 06 Push Notifications

## WHAT
Push notification flows: register token, store token, send push, handle opens and navigation.

## WHY
- Token lifecycle correctness is required for reliability and privacy.
- Tenant scoping must prevent cross-tenant notification leaks.

## HOW

### Token Lifecycle

#### Register
1. App requests push notification permissions
2. Expo Notifications provides device token
3. Token sent to backend with device ID, platform, user ID, tenant ID
4. Backend stores/updates token in `device_tokens` table

#### Rotate
- On app launch, check if token changed
- If changed, update backend with new token
- Old token automatically invalidated

#### Invalidate
- On logout: mark token as inactive or delete
- On tenant switch: update token's tenant association
- On failed delivery (invalid token response): remove token

### Tenant Scoping

#### Storage Model
```sql
device_tokens:
  id: uuid (PK)
  tenant_id: uuid (required)
  user_id: uuid (required)
  device_id: text (unique per user)
  token: text
  platform: 'ios' | 'android'
  is_active: boolean
  created_at: timestamptz
  updated_at: timestamptz
```

#### Enforcement
- Push notifications only sent to tokens matching target tenant
- RLS prevents cross-tenant token access
- API validates tenant context before sending

### Notification Triggers

#### New Message
- Recipient receives push for new messages in conversations
- Respects Event Chat exclusions (excluded users don't get push)
- Includes sender name, conversation name, message preview

#### Mention
- User mentioned in message receives push
- Higher priority than regular messages

#### Prayer Answered
- All recipients of prayer card notified when marked answered
- Celebratory notification style

#### Pastoral Journal
- Zone leader notified when small group leader submits entry
- Pastor notified when zone leader forwards entry
- Leader notified when pastor confirms

### Delivery Strategy

#### Best-Effort + Retry
- Initial delivery attempt
- Exponential backoff for transient failures (max 3 retries)
- Log all delivery outcomes

#### Logging
```
push_notification_logs:
  id: uuid
  token_id: uuid
  notification_type: text
  payload: jsonb
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  error_message: text (nullable)
  created_at: timestamptz
```

### Environment Separation

#### Development
- Use Expo push notification sandbox
- Separate token storage (dev tenant)
- Clear logging for debugging

#### Staging
- Production-like setup
- Test with real devices
- Monitor delivery rates

#### Production
- Production Expo credentials
- Monitoring and alerting on failures
- Rate limiting to prevent abuse

### Test Implications

#### Unit Tests
- Payload builders produce correct platform-specific format
- Token validation logic
- Notification type routing

#### Integration Tests
- Token registration stores correctly with tenant scope
- Token rotation updates existing record
- Tenant isolation: cannot query other tenant's tokens

#### E2E Tests (Optional - Mock Provider)
- Full flow: message sent → push received
- Prayer answered notification flow
- Pastoral journal workflow notifications
