---
tags: [spec, sdd, auth, authentication, tenant, session]
---

# Authentication Flows Specification

## WHAT

This specification defines the three core authentication flows for the Gagyo church messenger application:
1. **Login Flow**: Email/password authentication to access existing user accounts
2. **Signup Flow**: New user account creation with email verification
3. **Tenant Selection Flow**: Post-authentication selection of which church (tenant) the user wants to access

Additionally, this specification covers:
- Session management and persistence across app restarts
- Multi-tenant context management and switching
- Security requirements including JWT claims handling
- Error scenarios and recovery flows

## WHY

### Security Requirements
- **Credential Security**: Passwords are never stored locally; all authentication handled via Supabase Auth
- **Tenant Isolation**: Users can only access data from tenants where they have active memberships
- **Session Integrity**: JWT tokens automatically refresh; expired sessions redirect to login
- **Multi-tenancy**: A single user account can belong to multiple churches (tenants) with different roles

### Multi-tenant Isolation Rationale
- Churches (tenants) require strict data isolation for privacy and compliance
- Users may belong to multiple churches (e.g., member of one, pastor of another)
- RLS policies enforce tenant isolation at the database level
- Client-side tenant context ensures all API requests include tenant identification

### Session Management Rationale
- Users expect to stay logged in across app restarts
- Active tenant context must persist alongside auth session
- Logout must clear both auth session AND tenant context
- Session expiration requires clear user communication

## HOW

### Auth State Machine

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Unauthenticated │ ──> │ Login/Signup     │ ──> │ Authenticated        │ ──> │ Tenant Selection │ ──> │ Authenticated    │
│  (Initial State) │     │ (Credential Input)│     │ (no tenant context)  │     │ (Choose Church)  │     │ (with tenant)    │
└─────────────────┘     └─────────────────┘     └─────────────────────┘     └─────────────────┘     └─────────────────┘
         ▲                        │                         │                          │                        │
         │                        │                         │                          │                        │
         └────────────────────────┴─────────────────────────┴──────────────────────────┴────────────────────────┘
                                  (Logout / Session Expired returns to Unauthenticated)
```

### Login Flow

**Preconditions**: User has an existing account with at least one active membership

**User Journey**:
1. User launches app → redirected to Login screen (if not authenticated)
2. User enters email and password
3. System validates input format
4. System calls `signInWithPassword()` via Supabase Auth
5. On success:
   - Supabase returns session with JWT containing user claims
   - Session stored in AsyncStorage (auto-managed by Supabase client)
   - User redirected to Tenant Selection screen
6. On failure:
   - Display translated error message
   - User can retry or use "Forgot Password" flow

**API Calls**:
```typescript
// Supabase Auth
supabase.auth.signInWithPassword({ email, password })

// After auth, fetch memberships
supabase
  .from('memberships')
  .select('*, tenant:tenants(*)')
  .eq('user_id', userId)
  .eq('status', 'active')
```

**State Transitions**:
- `Unauthenticated` → `Authenticated(no_tenant)` on successful login
- Error remains in `Unauthenticated` with error message displayed

**Error Handling**:
| Error Scenario | Display Message | Recovery Action |
|----------------|-----------------|-----------------|
| Invalid email format | `auth:invalid_email` | User corrects email |
| Password too short | `auth:password_too_short` | User enters valid password |
| Wrong credentials | `auth:invalid_credentials` | User retries or resets password |
| Email not confirmed | `auth:email_not_confirmed` | Resend confirmation email |
| Network error | `common:network_error` | Retry button |

### Signup Flow

**Preconditions**: User does not have an account (or is creating a new one)

**User Journey**:
1. User navigates from Login to Signup screen
2. User enters:
   - Email address
   - Password (min 8 characters)
   - Confirm password (must match)
3. System validates all inputs
4. System calls `signUp()` via Supabase Auth
5. On success:
   - User record created in `users` table (via database trigger)
   - If user has a pending invitation, membership is created
   - Otherwise, user may need to join a church via invitation code
   - User redirected to Tenant Selection (or "No Churches" screen)
6. On failure:
   - Display translated error message
   - User can retry

**API Calls**:
```typescript
// Supabase Auth
supabase.auth.signUp({ email, password })

// Memberships are typically created via:
// 1. Invitation flow (admin creates membership before user signs up)
// 2. Join code (future feature)
```

**State Transitions**:
- `Unauthenticated` → `Authenticated(no_tenant)` on successful signup

**Validation Rules**:
| Field | Validation | Error Key |
|-------|-----------|-----------|
| Email | Regex: `^[^\s@]+@[^\s@]+\.[^\s@]+$` | `auth:invalid_email` |
| Password | Min 8 characters | `auth:password_too_short` |
| Confirm | Must match password | `auth:passwords_dont_match` |

### Tenant Selection Flow

**Preconditions**: User is authenticated (valid session exists)

**User Journey**:
1. After successful login/signup, user arrives at Tenant Selection
2. System fetches user's active memberships from Supabase
3. Display list of churches where user has `status='active'` membership
4. User taps on a church name
5. System:
   - Stores selected `tenant_id` in AsyncStorage (`@gagyo:active_tenant_id`)
   - Updates Zustand tenant store with tenant context
   - Redirects to Home screen
6. If no active memberships:
   - Display "No churches found" message
   - Provide guidance to contact church administrator

**API Calls**:
```typescript
// Fetch active memberships
supabase
  .from('memberships')
  .select('*, tenant:tenants(*)')
  .eq('user_id', userId)
  .eq('status', 'active')

// Verify membership (optional validation on selection)
supabase
  .from('memberships')
  .select('tenant:tenants(name)')
  .eq('tenant_id', selectedTenantId)
  .eq('status', 'active')
  .single()
```

**State Transitions**:
- `Authenticated(no_tenant)` → `Authenticated(with_tenant)` on selection
- Loading state while fetching memberships
- Error state if fetch fails

**Empty State**:
- Display: `auth:no_churches_found`
- No recovery action in app (requires church administrator intervention)

### Session Persistence

**Storage Strategy**:
- Supabase session: Auto-managed by Supabase client with AsyncStorage adapter
- Tenant context: Explicitly stored in AsyncStorage with key `@gagyo:active_tenant_id`

**App Launch Flow**:
```typescript
1. Initialize Supabase client (restores session from AsyncStorage if exists)
2. Load tenant context from AsyncStorage
3. Validate session (Supabase auto-refreshes if valid)
4. Validate tenant membership (verify user still has active membership)
5. Navigate based on combined auth+tenant state:
   - No session → Login screen
   - Session but no tenant → Tenant Selection
   - Session and valid tenant → Home screen
```

**Session Expiration**:
- Supabase client automatically attempts token refresh
- If refresh fails (e.g., revoked session), `onAuthStateChange` emits `SIGNED_OUT`
- App redirects to Login with message: `auth:session_expired`

### Tenant Context Management

**Zustand Store Interface**:
```typescript
interface TenantState {
  // State
  activeTenantId: string | null
  activeTenantName: string | null
  loading: boolean

  // Actions
  setActiveTenant: (tenantId: string, tenantName: string) => Promise<void>
  clearTenantContext: () => Promise<void>
  loadTenantFromStorage: () => Promise<void>
}
```

**Persistence**:
- Key: `@gagyo:active_tenant_id`
- Value: Tenant UUID string
- Updated on: Tenant selection, cleared on logout

**Validation**:
- When loading from storage, verify user still has active membership
- If membership no longer active, clear context and redirect to Tenant Selection

### Navigation Guards

**Guard Logic** (in `_layout.tsx`):
```typescript
const inAuthGroup = segments[0] === '(auth)'

if (authLoading || tenantLoading) return // Wait for initialization

if (!user && !inAuthGroup) {
  router.replace('/(auth)/login')
} else if (user && !hasTenant && !inAuthGroup) {
  router.replace('/(auth)/tenant-selection')
} else if (user && hasTenant && inAuthGroup) {
  router.replace('/(tabs)')
}
```

**Screen Access Rules**:
| Screen | Auth Required | Tenant Required | Redirect If Missing |
|-----------------------|-----------------|-------------------|
| Login | No | No | → Tenant Selection (if authenticated) |
| Signup | No | No | → Tenant Selection (if authenticated) |
| Tenant Selection | Yes | No | → Home (if tenant exists) |
| Home (tabs) | Yes | Yes | → Login (then Tenant Selection) |
| Settings | Yes | Yes | → Login (then Tenant Selection) |

### Security Considerations

**JWT Claims** (managed by Supabase Auth):
- `sub`: User UUID (from `auth.users.id`)
- `email`: User email
- `role`: `authenticated` (for authenticated users)

**Tenant Context**:
- NOT stored in JWT (client-side only)
- Sent with each Supabase query via RLS policies
- RLS policies use `auth.uid()` to filter by user's memberships

**Token Refresh**:
- Supabase client auto-refreshes tokens before expiration
- Configured with `autoRefreshToken: true`
- Refresh failures trigger `SIGNED_OUT` event

**Session Expiration**:
- Default session length: 1 hour (configurable in Supabase)
- Refresh token: Valid for 30 days (configurable)
- App handles `TOKEN_REFRESHED` event transparently

### Error Scenarios

**Login Errors**:
| Scenario | Error Message | User Action |
|----------|---------------|-------------|
| `Invalid login credentials` | `auth:invalid_credentials` | Check email/password, retry |
| `Email not confirmed` | `auth:email_not_confirmed` | Request new confirmation email |
| `Network error` | `common:network_error` | Check connection, retry |

**Signup Errors**:
| Scenario | Error Message | User Action |
|----------|---------------|-------------|
| `User already registered` | `auth:invalid_credentials` | Use login instead |
| `Password too weak` | `auth:password_too_short` | Use stronger password |
| `Invalid email` | `auth:invalid_email` | Correct email format |

**Tenant Selection Errors**:
| Scenario | Error Message | User Action |
|----------|---------------|-------------|
| No memberships found | `auth:no_churches_found` | Contact church admin |
| Network error fetching | `common:network_error` | Retry |

**Session Errors**:
| Scenario | Error Message | User Action |
|----------|---------------|-------------|
| Session expired | `auth:session_expired` | Login again |
| Tenant membership revoked | `auth:no_churches_found` | Select different tenant |

### Figma References

**Login Screen**:
- Location: Figma → Setting → Signup/Login screens
- Components: Email input, password input, login button, "Create account" link

**Signup Screen**:
- Location: Figma → Setting → Signup/Login screens
- Components: Email input, password input, confirm password input, signup button

**Tenant Selection**:
- Custom screen (not in original Figma)
- Design: List of church names as selectable buttons
- Based on existing Tamagui button styles

### Test Implications

**E2E Tests (Detox)**:
- Login flow: valid credentials, invalid credentials, empty fields
- Signup flow: valid signup, email validation, password validation
- Tenant selection: display list, select tenant, empty state
- Session persistence: login, restart app, verify still logged in
- Session expiration: simulate expired session, verify redirect
- i18n: verify Korean text displays correctly

**Integration Tests**:
- RLS policies: Verify users can only see their own memberships
- Tenant isolation: Verify queries scoped to active tenant
- Auth hooks: Verify session state updates correctly
- Tenant store: Verify AsyncStorage persistence

**Unit Tests**:
- Auth utilities: `signIn()`, `signUp()`, `signOut()`
- Tenant store: `setActiveTenant()`, `clearTenantContext()`, `loadTenantFromStorage()`
- Validation: Email regex, password length, password matching
- Navigation guards: Auth state → correct redirect

### Implementation Notes

**Supabase Client Configuration**:
```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

**Dependencies**:
- `@supabase/supabase-js`: ^2.89.0 (already installed)
- `@react-native-async-storage/async-storage`: ^2.2.0 (already installed)
- `zustand`: ^5.0.9 (already installed for tenant store)
- `expo-router`: For navigation
- `tamagui`: ^1.142.0 (for UI components)

**Environment Variables**:
```
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL_HERE
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

## Implementation Status

**Completed**: 2025-01-04

All authentication flows have been implemented according to this specification:

### Implemented Components

1. **Auth Utilities** (`src/lib/auth.ts`)
   - `signIn()`, `signUp()`, `signOut()` functions
   - Error mapping to i18n keys
   - Tenant context clearing on logout

2. **Auth Hooks** (`src/hooks/useAuth.ts`, `src/hooks/useMemberships.ts`)
   - `useAuth()`: Session state management with Supabase auth listener
   - `useMemberships()`: Fetch user's active memberships
   - `useAuthGuard()`: Navigation guard for protected routes
   - `useTenantContext()`: Tenant state management hook

3. **Tenant Store** (`src/stores/tenantStore.ts`)
   - Zustand store for tenant context
   - AsyncStorage persistence (`@gagyo:active_tenant_id`)
   - Membership validation on load

4. **Auth Screens** (`app/(auth)/`)
   - `login.tsx`: Email/password login form
   - `signup.tsx`: User registration with validation
   - `tenant-selection.tsx`: Church selection screen
   - `_layout.tsx`: Auth group navigation layout

5. **Navigation Guards** (`app/_layout.tsx`)
   - AuthGuard component with redirect logic
   - Automatic navigation based on auth+tenant state

### Test Coverage

1. **E2E Tests** (`e2e/auth.test.ts`)
   - Login flow with valid/invalid credentials
   - Signup flow with validation
   - Tenant selection flow
   - Session persistence across app restart
   - i18n localization verification

2. **Integration Tests**
   - `__tests__/integration/auth-context.test.ts`: Auth session management with RLS
   - `__tests__/integration/tenant-selection.test.ts`: Membership queries
   - `__tests__/integration/rls-policies.test.ts`: Tenant isolation enforcement

3. **Unit Tests**
   - `src/stores/__tests__/tenantStore.test.ts`: Tenant store persistence
   - `app/(auth)/__tests__/signup.test.tsx`: Signup validation

### Known Limitations

1. **Invitation Flow**: Users can only join churches via admin-created memberships
   - Future: Add join code functionality

2. **Forgot Password**: Uses Supabase's default reset flow
   - Future: Implement custom password reset screen

3. **Tenant Switching**: Requires logout and re-selection
   - Future: Add in-app tenant switching

### Running Tests

```bash
# Unit tests
bun test

# E2E tests (requires Detox setup)
bunx detox test --configuration ios.sim.debug

# Integration tests (requires Supabase credentials)
bun test __tests__/integration/
```

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-04 | Claude | Initial SDD specification for auth flows |
| 1.1 | 2025-01-04 | Claude | Added implementation status and notes |
