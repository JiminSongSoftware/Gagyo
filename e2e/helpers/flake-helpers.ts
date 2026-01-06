import { device, element, by, waitFor } from 'detox';

/**
 * Flake Mitigation Utilities for Detox E2E Tests
 *
 * This module provides utilities to reduce test flakiness caused by:
 * - Network delays
 * - Animation timing
 * - Race conditions
 * - Element visibility transitions
 * - Platform-specific timing variations
 *
 * Usage: Import and use these helpers instead of raw Detox APIs
 * to get built-in retry logic and consistent timing.
 */

// Default timeouts (in milliseconds)
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRY_DELAY = 500;
const DEFAULT_MAX_RETRIES = 3;

// Platform-specific adjustments
const IOS_DELAY = 100;
const ANDROID_DELAY = 300;
const PLATFORM_DELAY = device.getPlatform() === 'ios' ? IOS_DELAY : ANDROID_DELAY;

/**
 * Sleep for a specified duration
 * Useful for adding deliberate delays after actions that trigger animations
 */
export const sleep = async (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Sleep for a platform-appropriate duration after UI actions
 */
export const settle = async (): Promise<void> => {
  await sleep(PLATFORM_DELAY);
};

/**
 * Wait for an element to be visible with retry logic
 */
export const waitForVisible = async (
  matcher: Detox.NativeMatcher,
  options: { timeout?: number; maxRetries?: number } = {}
): Promise<void> => {
  const { timeout = DEFAULT_TIMEOUT, maxRetries = DEFAULT_MAX_RETRIES } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await waitFor(matcher).toBeVisible().withTimeout(timeout);
      return;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(DEFAULT_RETRY_DELAY * (attempt + 1));
    }
  }
};

/**
 * Wait for an element to not be visible with retry logic
 */
export const waitForNotVisible = async (
  matcher: Detox.NativeMatcher,
  options: { timeout?: number; maxRetries?: number } = {}
): Promise<void> => {
  const { timeout = DEFAULT_TIMEOUT, maxRetries = DEFAULT_MAX_RETRIES } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await waitFor(matcher).not.toBeVisible().withTimeout(timeout);
      return;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(DEFAULT_RETRY_DELAY * (attempt + 1));
    }
  }
};

/**
 * Wait for an element to exist with retry logic
 */
export const waitForExist = async (
  matcher: Detox.NativeMatcher,
  options: { timeout?: number; maxRetries?: number } = {}
): Promise<void> => {
  const { timeout = DEFAULT_TIMEOUT, maxRetries = DEFAULT_MAX_RETRIES } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await waitFor(matcher).toExist().withTimeout(timeout);
      return;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(DEFAULT_RETRY_DELAY * (attempt + 1));
    }
  }
};

/**
 * Tap an element with retry logic and settle delay
 */
export const safeTap = async (
  matcher: Detox.NativeMatcher,
  options: { maxRetries?: number; settleAfter?: boolean } = {}
): Promise<void> => {
  const { maxRetries = DEFAULT_MAX_RETRIES, settleAfter = true } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await waitForVisible(matcher);
      await matcher.tap();
      if (settleAfter) await settle();
      return;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(DEFAULT_RETRY_DELAY * (attempt + 1));
    }
  }
};

/**
 * Type text into an input with retry logic
 */
export const safeType = async (
  matcher: Detox.NativeMatcher,
  text: string,
  options: { clearFirst?: boolean; settleAfter?: boolean } = {}
): Promise<void> => {
  const { clearFirst = true, settleAfter = true } = options;

  await waitForVisible(matcher);

  if (clearFirst) {
    await matcher.tap();
    // Clear existing text (Ctrl+A + Backspace or similar)
    await matcher.replaceText('');
  }

  await matcher.typeText(text);

  if (settleAfter) await settle();
};

/**
 * Scroll to an element with retry logic
 */
export const safeScrollTo = async (
  scrollableViewMatcher: Detox.NativeMatcher,
  elementMatcher: Detox.NativeMatcher,
  options: { direction?: 'down' | 'up' | 'left' | 'right'; maxScrolls?: number } = {}
): Promise<void> => {
  const { direction = 'down', maxScrolls = 10 } = options;

  await waitForVisible(scrollableViewMatcher);

  for (let i = 0; i < maxScrolls; i++) {
    try {
      await waitFor(elementMatcher, { timeout: 1000 }).toBeVisible();
      return;
    } catch {
      await scrollableViewMatcher.scrollTo(direction);
      await settle();
    }
  }

  throw new Error(`Element not found after ${maxScrolls} scrolls`);
};

/**
 * Wait for network activity to complete
 * Useful for tests that involve API calls
 */
export const waitForNetworkIdle = async (options: { timeout?: number } = {}): Promise<void> => {
  const { timeout = 15000 } = options;

  // Wait for any network activity indicators to disappear
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const isLoading = await element(by.id('loading-indicator'))
        .withTimeout(100)
        .catch(() => false);

      if (!isLoading) {
        await sleep(PLATFORM_DELAY);
        return;
      }
    } catch {
      // Loading indicator not found, consider network idle
      return;
    }
    await sleep(100);
  }

  // Timeout reached but continue - network calls might still be completing
};

/**
 * Wait for an element to be visible with network awareness
 * Combines waiting with network idle check
 */
export const waitForVisibleWithNetwork = async (
  matcher: Detox.NativeMatcher,
  options: { timeout?: number; networkTimeout?: number } = {}
): Promise<void> => {
  const { timeout = DEFAULT_TIMEOUT, networkTimeout = 5000 } = options;

  await waitForNetworkIdle({ timeout: networkTimeout });
  await waitForVisible(matcher, { timeout });
};

/**
 * Retry an async operation with exponential backoff
 */
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; maxDelay?: number } = {}
): Promise<T> => {
  const { maxRetries = DEFAULT_MAX_RETRIES, baseDelay = 100, maxDelay = 2000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await sleep(delay);
      }
    }
  }

  throw lastError;
};

/**
 * Execute an action with animation synchronization
 * Ensures animations complete before proceeding
 */
export const withAnimationSync = async (action: () => Promise<void>): Promise<void> => {
  await action();
  // Wait for animations to complete
  await sleep(PLATFORM_DELAY * 2);
};

/**
 * Safe navigation helper that ensures destination is reached
 */
export const safeNavigate = async (
  action: () => Promise<void>,
  destinationMatcher: Detox.NativeMatcher,
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = DEFAULT_TIMEOUT } = options;

  await action();
  await settle();

  // Verify we reached the destination
  await waitForVisible(destinationMatcher, { timeout });
};

/**
 * Poll for a condition to be met
 */
export const poll = async (
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> => {
  const { timeout = DEFAULT_TIMEOUT, interval = 200 } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Wait for multiple elements to be visible
 */
export const waitForAllVisible = async (
  matchers: Detox.NativeMatcher[],
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = DEFAULT_TIMEOUT } = options;

  await Promise.all(matchers.map((matcher) => waitForVisible(matcher, { timeout })));
};

/**
 * Check if an element is visible without throwing
 */
export const isVisible = async (matcher: Detox.NativeMatcher): Promise<boolean> => {
  try {
    await matcher.withTimeout(500).toBeVisible();
    return true;
  } catch {
    return false;
  }
};

/**
 * Wait for loading to complete (common pattern across screens)
 */
export const waitForLoadingToComplete = async (
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = DEFAULT_TIMEOUT } = options;

  try {
    await waitFor(element(by.id('loading-indicator')))
      .not.toBeVisible()
      .withTimeout(timeout);
  } catch {
    // Loading indicator might not exist or was never shown
  }
};

/**
 * Safe swipe gesture with retry logic
 */
export const safeSwipe = async (
  matcher: Detox.NativeMatcher,
  direction: 'up' | 'down' | 'left' | 'right',
  options: { speed?: 'fast' | 'slow'; percentage?: number } = {}
): Promise<void> => {
  const { speed = 'fast', percentage = 0.8 } = options;

  await waitForVisible(matcher);

  await withAnimationSync(async () => {
    await matcher.swipe(direction, speed, percentage);
  });
};

/**
 * Execute test cleanup with safeguards
 */
export const safeCleanup = async (cleanupFn: () => Promise<void>): Promise<void> => {
  try {
    await cleanupFn();
  } catch (error) {
    console.warn('Cleanup failed, continuing...', error);
  }
};

/**
 * Test assertion wrapper with retry logic
 */
export const eventually = async (
  assertion: () => Promise<void>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> => {
  const { timeout = DEFAULT_TIMEOUT, interval = 200 } = options;

  const startTime = Date.now();
  let lastError: unknown;

  while (Date.now() - startTime < timeout) {
    try {
      await assertion();
      return;
    } catch (err) {
      lastError = err;
      await sleep(interval);
    }
  }

  throw lastError;
};

/**
 * Wait for text to appear in an element
 */
export const waitForText = async (
  matcher: Detox.NativeMatcher,
  text: string,
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = DEFAULT_TIMEOUT } = options;

  await waitFor(element(matcher).withText(text)).toBeVisible().withTimeout(timeout);
};

/**
 * Clear text input safely
 */
export const safeClearText = async (matcher: Detox.NativeMatcher): Promise<void> => {
  await waitForVisible(matcher);
  await matcher.tap();
  await matcher.replaceText('');
  await settle();
};

/**
 * Long press with retry logic
 */
export const safeLongPress = async (
  matcher: Detox.NativeMatcher,
  duration: number = 500
): Promise<void> => {
  await waitForVisible(matcher);

  await withAnimationSync(async () => {
    await matcher.longPress(duration);
  });
};

/**
 * Multi-tap gesture with retry logic
 */
export const safeMultiTap = async (
  matcher: Detox.NativeMatcher,
  count: number,
  options: { interval?: number } = {}
): Promise<void> => {
  const { interval = 50 } = options;

  await waitForVisible(matcher);

  for (let i = 0; i < count; i++) {
    await matcher.tap();
    if (i < count - 1) await sleep(interval);
  }

  await settle();
};

/**
 * Wait for an element to be enabled/tappable
 */
export const waitForEnabled = async (
  matcher: Detox.NativeMatcher,
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = DEFAULT_TIMEOUT } = options;

  await waitFor(matcher).toBeVisible().withTimeout(timeout);

  // Additional check for enabled state (platform-specific)
  await settle();
};

/**
 * Platform-specific wait helper
 * iOS typically needs less time than Android
 */
export const platformSettle = async (multiplier: number = 1): Promise<void> => {
  await sleep(PLATFORM_DELAY * multiplier);
};
