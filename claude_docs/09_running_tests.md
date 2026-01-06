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

## E2E Debugging with MCP

When E2E tests fail, use MCP (Model Context Protocol) tools for efficient debugging.

### Available MCP Servers

| MCP Server | Purpose |
|-------------|---------|
| `rn-debugger` | React Native app debugging |
| `ios-simulator` | iOS simulator control |
| `chrome-devtools` | Chrome DevTools inspection |

### rn-debugger for React Native Debugging

```bash
# Check connected apps and Metro status
get_apps

# View console logs
get_logs

# Search logs for specific text
search_logs --text "error"

# View network requests
get_network_requests

# Inspect global objects (Redux store, navigation, etc.)
list_debug_globals
inspect_global --objectName "__REDUX_STORE__"
```

**Example: Debugging authentication failure**

```bash
# 1. Check app connectivity
get_apps

# 2. Check for errors in logs
get_logs --level error

# 3. Inspect auth state in Redux
inspect_global --objectName "__REDUX_STORE__"

# 4. Check auth API requests
get_network_requests --urlPattern "auth"
```

### ios-simulator for iOS Device Control

```bash
# Take screenshot for visual debugging
ios_screenshot

# Get full accessibility tree
ios_describe_all

# Find element by accessibility label
ios_find_element --labelContains "Login"

# Tap element
ios_tap_element --labelContains "Submit"

# Type text
ios_input_text --text "test@example.com"

# Swipe gesture
ios_swipe --startX 100 --startY 500 --endX 100 --endY 200
```

**Example: Element not found debugging**

```bash
# 1. See what's actually on screen
ios_screenshot

# 2. Get accessibility tree
ios_describe_all

# 3. Find element by partial label match
ios_find_element --labelContains "log in"
```

### Common Debugging Workflows

#### Element Not Found

```bash
# Check actual screen state
ios_screenshot
ios_describe_all

# Look for loading overlays
ios_find_element --label "Loading"
```

#### Timeout Waiting for Element

```bash
# Check if app is responsive
get_apps

# Check network activity
get_network_requests

# Check for errors
get_logs --level error

# Inspect navigation state
inspect_global --objectName "navigation"
```

#### Authentication Issues

```bash
# Check auth state
inspect_global --objectName "__REDUX_STORE__"

# View auth API calls
get_network_requests --urlPattern "auth"

# Search for auth errors
search_logs --text "authentication failed"

# Get request details
get_request_details --requestId <ID>
```

### Flake Mitigation

Use flake mitigation helpers for more reliable tests:

```typescript
import { waitForVisible, safeTap, settle, waitForNetworkIdle } from './helpers/flake-helpers';

// Safe tap with retry logic
await safeTap(element(by.id('submit-button')));

// Wait with retry logic
await waitForVisible(element(by.id('success-message')), { timeout: 15000 });

// Settle after UI actions
await element(by.id('button')).tap();
await settle();

// Wait for network activity
await waitForNetworkIdle();
```

### MCP Quick Reference

**rn-debugger:**
- `get_apps` - List connected apps
- `get_logs` / `search_logs` - Console logs
- `get_network_requests` / `get_request_details` - Network activity
- `inspect_global` / `list_debug_globals` - Inspect app state
- `execute_in_app` - Run JavaScript in app
- `reload_app` - Reload React Native bundle

**ios-simulator:**
- `ios_screenshot` - Take screenshot
- `ios_describe_all` / `ios_describe_point` - Accessibility tree
- `ios_find_element` - Find element by label
- `ios_tap_element` - Tap element
- `ios_input_text` - Type text
- `ios_swipe` - Swipe gesture
- `ios_wait_for_element` - Wait for element

**chrome-devtools:**
- `browser_navigate` - Navigate to URL
- `browser_snapshot` - Get page snapshot
- `browser_click` - Click element
- `browser_evaluate` - Run JavaScript
- `browser_console_messages` - Console output