# E2E i18n Testing Guide

## Overview

This guide explains how to run end-to-end tests for internationalization (i18n) functionality in the Gagyo app.

## Prerequisites

1. **iOS Simulator or Android Emulator** running
2. **Detox CLI** installed globally: `bun install -g detox-cli`
3. **App built** for testing: `bun run e2e:build:ios` or `bun run e2e:build:android`

## Running E2E Tests

### iOS Tests

```bash
# Build the app for testing
bun run e2e:build:ios

# Run E2E tests
bun run e2e:test:ios

# Run specific i18n tests only
bunx detox test --configuration ios.sim.debug --test-name-pattern="i18n"
```

### Android Tests

```bash
# Build the app for testing
bun run e2e:build:android

# Run E2E tests
bun run e2e:test:android

# Run specific i18n tests only
bunx detox test --configuration android.emu.debug --test-name-pattern="i18n"
```

## Test Coverage

The `e2e/i18n.test.ts` file contains the following test suites:

### 1. Initial Locale Detection
- ✅ English device → English UI
- ✅ Korean device → Korean UI  
- ✅ Unsupported locale → English fallback

### 2. Locale Switching
- ✅ Switch EN → KO through settings
- ✅ Switch KO → EN through settings
- ✅ All UI elements update on locale change

### 3. Persistence
- ✅ Locale persists after app restart
- ✅ Locale persists across multiple sessions

### 4. Translation Display
- ✅ Home screen translations
- ✅ Chat list screen translations
- ✅ Error messages in both locales

### 5. Fallback Behavior
- ✅ English fallback when Korean missing
- ✅ Key name display when completely missing

### 6. Date/Number Formatting
- ✅ Date format by locale (en: "January 15, 2024", ko: "2024년 1월 15일")
- ✅ Number formatting by locale
- ✅ Relative time by locale (en: "5 minutes ago", ko: "5분 전")

### 7. Edge Cases
- ✅ Rapid locale switching (stress test)
- ✅ Accessibility labels update correctly

## Test IDs Required

The E2E tests expect the following test IDs in the app:

| Test ID | Purpose | Required Screen |
|---------|---------|-----------------|
| `app-root` | Main app container | All |
| `settings-button` | Navigate to settings | Home |
| `settings-screen` | Settings view | Settings |
| `language-selector` | Language picker | Settings |
| `back-button` | Navigate back | All |
| `chat-screen-button` | Navigate to chat | Home |
| `chat-screen` | Chat view | Chat |
| `chat-list-button` | Navigate to chat list | Home |
| `chat-list-screen` | Chat list view | Chat List |
| `save-button` | Save action button | Forms |
| `trigger-error-button` | Test error display | Development only |
| `profile-screen-button` | Navigate to profile | Home |
| `stats-screen-button` | Navigate to stats | Home |

## Manual Testing Checklist

If automated E2E tests cannot run, use this manual checklist:

### Locale Switching
- [ ] App launches in English (en-US device)
- [ ] App launches in Korean (ko-KR device)
- [ ] Settings → Language → Select Korean → All UI updates
- [ ] Settings → Language → Select English → All UI updates
- [ ] Selected locale persists after closing and reopening app

### Translation Quality
- [ ] No hardcoded strings visible in Korean mode
- [ ] No truncated text in Korean mode
- [ ] No overlapping text in Korean mode
- [ ] All user-facing text is translated
- [ ] Error messages appear in correct language
- [ ] Button labels are translated
- [ ] Form placeholders are translated
- [ ] Date formats match locale conventions
- [ ] Number formats match locale conventions

### Accessibility
- [ ] Screen readers announce text in correct language
- [ ] Accessibility labels are translated
- [ ] Button actions are announced correctly

## Debugging Failed E2E Tests

### Common Issues

1. **"Element not found" errors**
   - Verify test IDs are added to components
   - Check if Detox is properly configured
   - Ensure app is fully built

2. **"Timeout waiting for element"**
   - Increase timeout in test (default 5000ms)
   - Check if navigation is working
   - Verify device/emulator is responsive

3. **Locale not switching**
   - Verify AsyncStorage is working
   - Check useLocale hook implementation
   - Ensure i18n provider wraps app

### Viewing Debug Output

```bash
# Run with verbose output
bunx detox test --configuration ios.sim.debug --log-level verbose

# Run with Detox inspector
bunx detox test --configuration ios.sim.debug --inspect
```

## Continuous Integration

In CI/CD pipeline:

1. Build app for testing
2. Run Detox tests with `--headless` flag
3. Capture screenshots on failures
4. Upload test results as artifacts
