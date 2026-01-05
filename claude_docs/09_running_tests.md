---
tags: [testing, detox, unit, e2e, ci]
---

# 09 Running Tests

## WHAT
How to run unit/integration/E2E tests, naming conventions, and CI expectations.

## WHY
- TDD is mandatory; tests must be easy to run.
- Deterministic tests reduce regressions and flaky CI.

## HOW

### Unit Tests

#### Runner
Jest (via Expo or standalone configuration)

#### Commands
```bash
# Run all unit tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test src/features/chat/__tests__/ChatMessage.test.tsx

# Run with coverage
bun test --coverage
```

#### Location
Tests co-located in `__tests__` directories within feature folders:
```
src/features/chat/
  __tests__/
    ChatMessage.test.tsx
    useChatMessages.test.ts
  ChatMessage.tsx
  useChatMessages.ts
```

### Integration Tests

#### Strategy
- Test Supabase RLS policies
- Test API endpoint behavior
- Use test database or mocked Supabase client

#### Running Integration Tests
```bash
# Run integration tests (separate from unit)
bun test:integration
```

#### RLS Testing Approach
- Create test users in different tenants
- Verify positive access (same tenant)
- Verify negative access (cross-tenant rejection)

### E2E Tests (Detox)

#### Setup
```bash
# Install Detox CLI
bun install -g detox-cli

# Build for iOS
detox build --configuration ios.sim.debug

# Build for Android
detox build --configuration android.emu.debug
```

#### Running E2E Tests
```bash
# iOS
detox test --configuration ios.sim.debug

# Android
detox test --configuration android.emu.debug
```

#### Key Test Scenarios
1. Login → Select Tenant → View Chat
2. Send Message → Verify Delivery
3. Event Chat: Excluded User Cannot See Message
4. Tenant Isolation: User A Cannot See User B's Data
5. Push Notification Flow (with mocks)

### Test Naming Conventions

#### File Names
- Unit: `ComponentName.test.tsx` or `functionName.test.ts`
- Integration: `featureName.integration.test.ts`
- E2E: `featureName.e2e.ts`

#### Test Descriptions
```typescript
describe('ChatMessage', () => {
  describe('when message is from current user', () => {
    it('should render on the right side', () => {
      // ...
    });
  });

  describe('Event Chat', () => {
    it('should not render for excluded users', () => {
      // ...
    });
  });
});
```

### Minimum Coverage Expectations

#### Critical Paths (Required)
- Tenant isolation logic: 100%
- Event Chat visibility: 100%
- Push notification payload builders: 100%
- Authentication flows: 90%+

#### General
- New features: 80%+ coverage
- Bug fixes: Include regression test

### CI Expectations

#### Required Checks
1. Lint passes (`eslint`)
2. Type check passes (`tsc --noEmit`)
3. Unit tests pass
4. Integration tests pass (if applicable)
5. E2E tests pass (critical flows)

#### Failure Triage
- Flaky tests: Investigate and fix or quarantine
- Genuine failures: Block merge until resolved
- Infrastructure issues: Document and escalate

### Mocking Guidelines

#### External Services
- Mock Supabase client for unit tests
- Mock push notification provider
- Use MSW for API mocking if needed

#### Deterministic Tests
- No real network calls in unit tests
- Seed data for consistent state
- Control time-dependent logic

Ontology violations are test failures.

- Introducing undeclared domain terms
- Violating defined invariants
- Crossing aggregate boundaries improperly