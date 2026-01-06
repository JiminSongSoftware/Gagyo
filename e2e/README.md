# E2E Testing with Detox

This directory contains end-to-end tests for the Gagyo app using Detox.

## Running Tests

### iOS

```bash
# Build the app for testing
bun run e2e:build:ios

# Run all tests
bun run e2e:test:ios

# Run specific test file
bun run e2e:test:ios e2e/auth.test.ts

# Run specific test suite
bun run e2e:test:ios -- --grep "Prayer Cards"
```

### Android

```bash
# Build the app for testing
bun run e2e:build:android

# Run all tests
bun run e2e:test:android

# Run specific test file
bun run e2e:test:android e2e/auth.test.ts

# Run specific test suite
bun run e2e:test:android -- --grep "Pastoral Journal"
```

## Debugging with MCP Tools

When E2E tests fail, use the available MCP (Model Context Protocol) tools for efficient debugging.

### Prerequisites

Ensure the following MCP servers are connected:
- `rn-debugger` - React Native debugging
- `ios-simulator` - iOS simulator control
- `chrome-devtools` - Web/DevTools inspection

### MCP Debugging Workflow

#### 1. Using `rn-debugger` for React Native Debugging

The `rn-debugger` MCP provides powerful debugging capabilities for React Native apps:

```bash
# Check connected apps and Metro status
get_apps

# View console logs
get_logs

# Search logs for specific text
search_logs --text "error"

# View network requests
get_network_requests

# Inspect global objects (Redux store, navigation state, etc.)
list_debug_globals
inspect_global --objectName "__REDUX_STORE__"
```

**Example: Debugging a failed login test**

```javascript
// 1. Check app connectivity
get_apps
// Returns: { apps: [{ id: '1', name: 'Gagyo', status: 'connected' }] }

// 2. Check for errors in logs
get_logs --level error
// Returns any error-level logs

// 3. Inspect Redux store
inspect_global --objectName "__REDUX_STORE__"
// Returns store state including auth status

// 4. Check network requests
get_network_requests
// Shows API calls made during test
```

#### 2. Using `ios-simulator` for iOS Device Control

The `ios-simulator` MCP provides direct control over iOS simulators:

```bash
# Get list of simulators
list_ios_simulators

# Boot a specific simulator
ios_boot_simulator --udid <SIMULATOR_UDID>

# Take a screenshot for visual debugging
ios_screenshot

# Describe UI element at specific coordinates
ios_describe_point --x 100 --y 200

# Find UI element by accessibility label
ios_find_element --labelContains "Login"

# Tap an element
ios_tap_element --labelContains "Submit"

# Type text
ios_input_text --text "test@example.com"

# Swipe gestures
ios_swipe --startX 100 --startY 500 --endX 100 --endY 200
```

**Example: Debugging element not found**

```javascript
// 1. Take screenshot to see actual screen
ios_screenshot

// 2. Describe all visible UI elements
ios_describe_all
// Returns full accessibility tree

// 3. Find the login button (partial match)
ios_find_element --labelContains "log in"
// Returns: { id: 'btn-123', label: 'Log In', ... }

// 4. Tap it
ios_tap_element --labelContains "log in"
```

#### 3. Using `chrome-devtools` for Chrome Debugging

For web debugging or inspecting DevTools:

```bash
# Navigate to URL
browser_navigate --url http://localhost:8081/debugger-ui/

# Take snapshot of current page
browser_snapshot

# Click element
browser_click --element "Login Button" --ref "btn-submit"

# Evaluate JavaScript
browser_evaluate --function "() => { return window.__REACT_DEVTOOLS_GLOBAL_HOOK__ }"
```

### Common Debugging Scenarios

#### Scenario 1: Test Fails with "Element Not Found"

```bash
# Step 1: Check what's actually on screen
ios_screenshot

# Step 2: Get full accessibility tree
ios_describe_all

# Step 3: If element exists but testID is wrong, find by label
ios_find_element --labelContains "Expected Text"

# Step 4: Check if there's an overlay or loading state
ios_find_element --label "Loading"
```

#### Scenario 2: Test Fails with Timeout

```bash
# Step 1: Check if app is responsive
list_ios_simulators --onlyBooted true

# Step 2: Check for network activity
# (use rn-debugger)
get_network_requests

# Step 3: Check console for errors
get_logs --level error

# Step 4: Inspect app state
inspect_global --objectName "navigation"
```

#### Scenario 3: Authentication Failure

```bash
# Step 1: Check auth state in Redux
inspect_global --objectName "__REDUX_STORE__"

# Step 2: View network requests to see auth API calls
get_network_requests --urlPattern "auth"

# Step 3: Check for specific error messages
search_logs --text "authentication failed"

# Step 4: Get request details for failed auth call
get_request_details --requestId <REQUEST_ID>
```

#### Scenario 4: Multi-Tenant Isolation Issues

```bash
# Step 1: Check current tenant context
# (via rn-debugger)
execute_in_app --expression "global.__REDUX_STORE__.getState().tenant"

# Step 2: Verify tenant data isolation
inspect_global --objectName "__REDUX_STORE__"

# Step 3: Check network requests for tenant filtering
get_network_requests --urlPattern "tenant"
```

### MCP Tool Reference

#### rn-debugger Tools

| Tool | Purpose |
|------|---------|
| `get_apps` | List connected React Native apps |
| `get_logs` | Retrieve console logs |
| `search_logs` | Search logs for text |
| `get_network_requests` | View network activity |
| `get_request_details` | Get full request/response |
| `inspect_global` | Inspect global object |
| `list_debug_globals` | List debuggable globals |
| `execute_in_app` | Execute JavaScript in app |
| `reload_app` | Trigger React Native reload |

#### ios-simulator Tools

| Tool | Purpose |
|------|---------|
| `list_ios_simulators` | List available simulators |
| `ios_boot_simulator` | Boot a simulator |
| `ios_screenshot` | Take screenshot |
| `ios_describe_all` | Get accessibility tree |
| `ios_describe_point` | Get element at coordinates |
| `ios_find_element` | Find element by label/value |
| `ios_tap_element` | Tap element by label |
| `ios_input_text` | Type text |
| `ios_swipe` | Perform swipe gesture |
| `ios_wait_for_element` | Wait for element to appear |

#### chrome-devtools Tools

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Navigate to URL |
| `browser_snapshot` | Get page snapshot |
| `browser_click` | Click element |
| `browser_evaluate` | Run JavaScript |
| `browser_console_messages` | Get console output |
| `browser_network_requests` | View network activity |

## Test Organization

### Helper Functions

Test helpers are organized by feature:

- `auth-helpers.ts` - Authentication and multi-tenant testing
- `navigation-helpers.ts` - Navigation between screens
- `chat-helpers.ts` - Chat functionality
- `event-chat-helpers.ts` - Event chat functionality
- `prayer-helpers.ts` - Prayer cards functionality
- `pastoral-helpers.ts` - Pastoral journal functionality
- `thread-helpers.ts` - Chat thread operations
- `images-helpers.ts` - Image handling
- `notification-helpers.ts` - Push notification testing
- `flake-helpers.ts` - Flake mitigation utilities

### Flake Mitigation

The `flake-helpers.ts` module provides utilities to reduce test flakiness:

```typescript
import { waitForVisible, safeTap, settle, waitForNetworkIdle } from './helpers/flake-helpers';

// Use safeTap instead of raw tap for retry logic
await safeTap(element(by.id('submit-button')));

// Use waitForVisible with retry logic
await waitForVisible(element(by.id('success-message')), { timeout: 15000 });

// Use settle after UI actions
await element(by.id('button')).tap();
await settle(); // Wait for animations to complete

// Use waitForNetworkIdle for API-dependent tests
await waitForNetworkIdle();
```

### Multi-Tenant Testing

Tests can verify tenant isolation using the multi-tenant helpers:

```typescript
import { loginToTenant, verifyTenantIsolation } from './helpers/auth-helpers';

// Test data isolation between tenants
await loginToTenant({ email: 'user@test.com', password: 'pass123', tenant: 'Tenant A' });
await verifyTenantIsolation(
  ['Tenant A Data'],  // Should be visible
  ['Tenant B Data']  // Should NOT be visible
);
```

### i18n Testing

Korean locale tests verify internationalization:

```typescript
describe('Feature (Korean Locale)', () => {
  beforeAll(async () => {
    await device.launchApp({
      languageAndRegion: { language: 'ko-KR' }
    });
  });

  it('should display Korean UI elements', async () => {
    await expect(element(by.text('기도'))).toBeVisible();
  });
});
```

## Test Coverage

See `e2e/coverage-report.md` for detailed coverage information.

## CI/CD

Tests run automatically on:
- Push to `main` branch
- Pull requests to `main` branch
- Manual workflow dispatch

The CI pipeline uses sharding to parallelize test execution and provides artifacts for debugging failures.
