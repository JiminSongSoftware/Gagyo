---
tags: [sdd, monitoring, observability, sentry, posthog]
---

# Monitoring and Observability

## WHAT

Comprehensive monitoring and observability integration for Gagyo using Sentry (error tracking) and PostHog (product analytics). This document defines the integration architecture, event taxonomy, error handling patterns, and Edge Function logging standards.

## WHY

- **Error Visibility**: Capture and track production errors with full context for rapid debugging
- **User Insights**: Understand user behavior through event analytics and funnel tracking
- **Multi-Tenant Analytics**: Enable tenant-scoped analytics while maintaining data isolation
- **Proactive Monitoring**: Detect issues before users report them through error trends and performance metrics
- **Compliance**: Maintain audit trails through structured logging in Edge Functions

## HOW

### Integration Architecture

The monitoring integration follows a three-layer architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Layer                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │ Sentry SDK      │    │ PostHog SDK     │    │ Tracking Hooks  │     │
│  │ Error Capture   │    │ Event Analytics │    │ useTracking()   │     │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘     │
│           │                      │                      │               │
│           └──────────────────────┴──────────────────────┘               │
│                                  │                                     │
├──────────────────────────────────┼─────────────────────────────────────┤
│                         Initialization (app/_layout.tsx)                  │
│                    - Sentry.init() with DSN and config                 │
│                    - PostHog.init() with API key                       │
│                    - Error boundary wrapper                             │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼─────────────────────────────────────┐
│                        Edge Function Layer                              │
├──────────────────────────────────┼─────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                            │
│  │ Logger          │    │ Sentry (Deno)   │                            │
│  │ Structured JSON │    │ Error Capture   │                            │
│  └─────────────────┘    └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Client-Side Initialization Order

In `app/_layout.tsx`:

1. **Environment detection**: Read `EXPO_PUBLIC_ENV` to determine environment
2. **Sentry initialization**: Initialize Sentry before any other code to capture early errors
3. **PostHog initialization**: Initialize PostHog after i18n is ready
4. **Provider wrapping**: Wrap app tree with Sentry error boundary and PostHog provider
5. **Context injection**: Set up user context when auth state changes

#### Cleanup on Unmount

- Sentry: Automatically handled by SDK
- PostHog: Automatically handled by SDK
- User context: Explicitly cleared on logout

---

### Event Taxonomy Implementation

The event taxonomy from `claude_docs/03_service_architecture.md` is implemented as TypeScript type-safe constants.

#### Sentry Event Types

```typescript
// Error categories for Sentry
enum SentryErrorCategory {
  AUTH = 'auth',
  NETWORK = 'network',
  DATABASE = 'database',
  PUSH = 'push',
  REALTIME = 'realtime',
  UI = 'ui',
}

// Severity levels
enum SentrySeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal',
}

// Context tag interfaces
interface SentryContextTags {
  tenant_id?: string;
  user_role?: Role;
  locale?: Locale;
  app_version: string;
  environment: Environment;
}
```

#### PostHog Event Types

```typescript
// Event name constants (string literal union type)
type PostHogEventName =
  // Auth events
  | 'user_signed_in'
  | 'user_signed_out'
  | 'tenant_switched'
  // Chat events
  | 'message_sent'
  | 'conversation_opened'
  // Prayer events
  | 'prayer_card_created'
  | 'prayer_answered'
  // Pastoral events
  | 'journal_submitted'
  | 'journal_reviewed'
  // Settings events
  | 'locale_changed'
  | 'notification_toggled';

// Event property interfaces
interface PostHogEventProperties {
  // Base properties (included in all events)
  tenant_id?: string;
  locale?: Locale;
  app_version: string;

  // Auth properties
  method?: 'email' | 'magic_link' | 'sso';

  // Chat properties
  conversation_type?: ConversationType;
  has_attachment?: boolean;
  is_event_chat?: boolean;
  message_count?: number;

  // Prayer properties
  recipient_scope?: 'individual' | 'small_group' | 'church_wide';
  days_since_created?: number;

  // Pastoral properties
  week_number?: number;
  content_length?: number;
  reviewer_role?: Role;
  days_since_submitted?: number;

  // Settings properties
  from_locale?: Locale;
  to_locale?: Locale;
  type?: string;
  enabled?: boolean;
}
```

#### User Properties

```typescript
interface PostHogUserProperties {
  tenant_count: number;
  primary_role: Role;
  locale: Locale;
  created_at: string; // ISO timestamp
}
```

#### Group Properties

```typescript
interface PostHogGroupProperties {
  name: string;
  member_count: number;
  created_at: string; // ISO timestamp
}
```

---

### Error Tracking Patterns

#### Error Boundaries

```typescript
// Sentry error boundary wrapper component
import { SentryErrorBoundary } from '@/lib/monitoring/sentry';

<SentryErrorBoundary fallback={ErrorFallback}>
  <App />
</SentryErrorBoundary>
```

#### Automatic Error Capture

Sentry automatically captures:
- Unhandled exceptions
- Unhandled promise rejections
- Native crashes (via sentry-expo)
- Fatal errors

#### Manual Error Reporting

```typescript
import { captureError } from '@/lib/monitoring/sentry';

try {
  // Operation that might fail
} catch (error) {
  captureError(error, {
    context: 'operation_name',
    tenant_id: currentTenantId,
    user_role: currentUserRole,
  });
}
```

#### Context Enrichment

All errors include:
- **tenant_id**: Current tenant context
- **user_role**: User's role in current tenant
- **locale**: User's preferred language
- **app_version**: App version from app.json
- **environment**: development/preview/production

#### Breadcrumbs

Breadcrumbs track user actions leading up to an error:
- Navigation: Screen changes via Expo Router
- User actions: Button clicks, form submissions
- API calls: Outgoing requests to Supabase/Edge Functions
- State changes: Tenant switches, auth state changes

---

### User Identification Flow

#### On Login

```typescript
// In useAuth hook, after successful login
const { setUserContext: setSentryUser } = useSentry();
const { identifyUser: identifyPostHogUser } = usePostHog();

setSentryUser(userId, {
  tenant_id,
  role: membership.role,
  locale: user.locale,
});

identifyPostHogUser(userId, {
  tenant_count: user.memberships.length,
  primary_role: getHighestRole(user.memberships),
  locale: user.locale,
  created_at: user.created_at,
});

setGroup('tenant', tenantId, {
  name: tenant.name,
  member_count: tenant.member_count,
  created_at: tenant.created_at,
});
```

#### On Tenant Switch

```typescript
// In tenantStore, when active tenant changes
setSentryTags({ tenant_id: newTenantId });
setGroup('tenant', newTenantId, groupProperties);
```

#### On Logout

```typescript
// In useAuth hook, on logout
clearUserContext(); // Sentry
resetUser(); // PostHog
```

#### On Profile Update

```typescript
// When user updates locale or other profile data
setSentryUser(userId, updatedProperties);
identifyPostHogUser(userId, updatedProperties);
```

---

### Edge Function Logging

#### Structured JSON Format

```typescript
interface EdgeFunctionLog {
  timestamp: string;           // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error';
  function_name: string;       // Edge Function name
  tenant_id?: string;          // Tenant context (if available)
  user_id?: string;            // User context (if available)
  request_id: string;          // Unique request identifier
  duration_ms?: number;        // Request duration in milliseconds
  message: string;             // Human-readable message
  metadata?: Record<string, unknown>; // Additional context
}
```

#### Log Levels

- **debug**: Detailed information for debugging
- **info**: General informational messages
- **warn**: Warning messages for potentially harmful situations
- **error**: Error messages for errors that occurred

#### Logger Usage

```typescript
// In Edge Functions
import { log } from '../_shared/logger';

// Function entry
log.info('send-push-notification', 'Function started', {
  tenant_id,
  user_count: user_ids.length,
});

// Database query
log.debug('send-push-notification', 'Fetching device tokens', {
  tenant_id,
  user_ids,
});

// Error
log.error('send-push-notification', 'Failed to send push notification', {
  tenant_id,
  error: error.message,
  failed_tokens,
});

// Function exit
log.info('send-push-notification', 'Function completed', {
  tenant_id,
  duration_ms: endTime - startTime,
  sent_count: results.sent,
});
```

#### Sentry Integration for Edge Functions

Optional: Send error-level logs to Sentry using the Sentry Deno SDK:

```typescript
if (level === 'error') {
  // Send to Sentry if configured
  if (Deno.env.get('SENTRY_DSN')) {
    // Sentry.captureException(...)
  }
}
```

---

### Environment Variables

#### Client-Side

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | Yes (production) | Sentry data source name |
| `EXPO_PUBLIC_ENV` | Yes | Environment: development/preview/production |
| `EXPO_PUBLIC_POSTHOG_API_KEY` | Yes (production) | PostHog project API key |
| `EXPO_PUBLIC_POSTHOG_HOST` | No | PostHog host (default: https://app.posthog.com) |

#### Edge Functions

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | No | Sentry DSN for Edge Function error tracking |

---

### Testing Strategy

#### Mock Configuration

Existing mocks in `jest.setup.js`:

```javascript
// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTags: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock PostHog
jest.mock('posthog-react-native', () => ({
  PostHogProvider: ({ children }) => children,
  usePostHog: () => ({
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
  }),
}));
```

#### Unit Tests

- Test tracking helper functions with mocked SDKs
- Verify event names and properties match schema
- Test user identification flow
- Test context enrichment

#### Integration Tests

- Test error boundary renders fallback
- Test tracking calls are made on user actions
- Verify context is cleared on logout

---

### Performance Considerations

#### Sampling Rates

| Environment | Error Sampling | Transaction Sampling | Analytics Sampling |
|-------------|----------------|---------------------|-------------------|
| Development | 100% | 100% | 100% |
| Preview | 100% | 50% | 100% |
| Production | 100% | 25% | 100% |

#### Batch Sizes

- PostHog: Flush events every 30 seconds or when 20 events accumulate
- Sentry: Send errors immediately, batch breadcrumbs

#### Network Impact Mitigation

- Compress events before sending
- Queue events locally when offline
- Retry failed sends with exponential backoff
- Deduplicate identical events

---

## Test Implications

### Unit Tests Required

| File | Tests |
|------|-------|
| `src/lib/monitoring/__tests__/sentry.test.ts` | Initialization, context setting, error capture, breadcrumbs |
| `src/lib/monitoring/__tests__/posthog.test.ts` | Initialization, user identification, event tracking |
| `src/lib/monitoring/__tests__/tracking.test.ts` | Unified tracking, context injection, API call tracking |
| `src/hooks/__tests__/useTracking.test.tsx` | Hook behavior, memoization, context injection |

### Integration Tests Required

| Scenario | Tests |
|----------|-------|
| Login flow | User identification called with correct properties |
| Tenant switch | Tags and groups updated correctly |
| Logout | User context cleared from both services |
| Error boundary | Fallback rendered, error captured |

---

## Security Considerations

### Data Privacy

- **PII**: No personally identifiable information in event properties
- **Tenant isolation**: All events include tenant_id for multi-tenant analytics
- **User consent**: PostHog respects user privacy settings (future)

### Secret Management

- DSN and API keys stored in environment variables
- Never committed to repository
- Rotatable via EAS secrets and GitHub secrets

### Rate Limiting

- Sentry: 100 errors/minute per tenant
- PostHog: 1000 events/minute per tenant

---

## Figma References

None (this is infrastructure work, no UI changes)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-05 | Claude | Initial SDD for monitoring and observability |
