import { element, by, waitFor, expect as detoxExpect } from 'detox';
import { navigateToTab } from './navigation-helpers';

/**
 * Reusable helper functions for Images E2E tests.
 *
 * These functions encapsulate common image gallery actions to reduce
 * test code duplication and improve maintainability.
 */

/**
 * Navigate to the Images tab.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 3000ms)
 */
export async function navigateToImages(options: { timeout?: number } = {}) {
  const { timeout = 3000 } = options;
  await navigateToTab('Images', { timeout });
}

/**
 * Verify the image grid is visible.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for verification (default: 5000ms)
 */
export async function expectImageGridVisible(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.id('image-grid')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify the empty state is visible (no images).
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for verification (default: 3000ms)
 */
export async function expectEmptyState(options: { timeout?: number } = {}) {
  const { timeout = 3000 } = options;

  await waitFor(element(by.id('image-grid-empty')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Tap on an image in the grid to open the viewer.
 *
 * @param index - The index of the image to tap (0-based)
 * @param options - Optional configuration
 * @param options.timeout - Timeout for action (default: 3000ms)
 */
export async function tapImage(index: number, options: { timeout?: number } = {}) {
  const { timeout = 3000 } = options;

  const imageItem = element(by.id(`image-grid-item-${index}`));
  await waitFor(imageItem).toBeVisible().withTimeout(timeout);
  await imageItem.tap();
}

/**
 * Verify the full-screen image viewer is visible.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for verification (default: 3000ms)
 */
export async function expectImageViewerVisible(options: { timeout?: number } = {}) {
  const { timeout = 3000 } = options;

  await waitFor(element(by.id('image-viewer')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Close the full-screen image viewer.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for action (default: 3000ms)
 */
export async function closeImageViewer(options: { timeout?: number } = {}) {
  const { timeout = 3000 } = options;

  const closeButton = element(by.id('image-viewer-close'));
  await waitFor(closeButton).toBeVisible().withTimeout(timeout);
  await closeButton.tap();

  // Verify viewer is dismissed
  await waitFor(element(by.id('image-viewer')))
    .not.toBeVisible()
    .withTimeout(timeout);
}

/**
 * Swipe to the next image in the viewer.
 *
 * @param options - Optional configuration
 * @param options.direction - Swipe direction ('left' to go next, 'right' to go previous)
 */
export async function swipeImage(options: { direction?: 'left' | 'right' } = {}) {
  const { direction = 'left' } = options;

  const viewer = element(by.id('image-viewer-carousel'));
  await viewer.swipe(direction);
}

/**
 * Verify the image counter shows the expected value.
 *
 * @param current - Current image index (1-based)
 * @param total - Total number of images
 * @param options - Optional configuration
 * @param options.timeout - Timeout for verification (default: 3000ms)
 */
export async function expectImageCounter(
  current: number,
  total: number,
  options: { timeout?: number } = {}
) {
  const { timeout = 3000 } = options;
  const counterText = `${current} / ${total}`;

  await waitFor(element(by.text(counterText)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Open the conversation filter sheet.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for action (default: 3000ms)
 */
export async function openFilterSheet(options: { timeout?: number } = {}) {
  const { timeout = 3000 } = options;

  const filterButton = element(by.id('images-filter-button'));
  await waitFor(filterButton).toBeVisible().withTimeout(timeout);
  await filterButton.tap();

  // Verify filter sheet is visible
  await waitFor(element(by.id('image-filter-sheet')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Select a conversation from the filter sheet.
 *
 * @param conversationName - The name of the conversation to select
 * @param options - Optional configuration
 * @param options.timeout - Timeout for action (default: 3000ms)
 */
export async function selectConversationFilter(
  conversationName: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 3000 } = options;

  const conversationItem = element(by.text(conversationName));
  await waitFor(conversationItem).toBeVisible().withTimeout(timeout);
  await conversationItem.tap();

  // Verify filter sheet is dismissed
  await waitFor(element(by.id('image-filter-sheet')))
    .not.toBeVisible()
    .withTimeout(timeout);
}

/**
 * Clear the conversation filter (show all images).
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for action (default: 3000ms)
 */
export async function clearConversationFilter(options: { timeout?: number } = {}) {
  const { timeout = 3000 } = options;

  await openFilterSheet({ timeout });

  const allOption = element(by.id('filter-all-conversations'));
  await waitFor(allOption).toBeVisible().withTimeout(timeout);
  await allOption.tap();
}

/**
 * Search for a conversation in the filter sheet.
 *
 * @param searchText - Text to search for
 * @param options - Optional configuration
 * @param options.timeout - Timeout for action (default: 3000ms)
 */
export async function searchConversationFilter(
  searchText: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 3000 } = options;

  const searchInput = element(by.id('filter-search-input'));
  await waitFor(searchInput).toBeVisible().withTimeout(timeout);
  await searchInput.typeText(searchText);
}

/**
 * Pull to refresh the image grid.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for refresh completion (default: 5000ms)
 */
export async function pullToRefresh(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  const grid = element(by.id('image-grid'));
  await grid.swipe('down', 'slow', 0.5);

  // Wait for refresh to complete (loading indicator should disappear)
  await waitFor(element(by.id('image-grid-loading')))
    .not.toBeVisible()
    .withTimeout(timeout);
}

/**
 * Scroll to load more images (infinite scroll).
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for loading (default: 5000ms)
 */
export async function scrollToLoadMore(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  const grid = element(by.id('image-grid'));
  await grid.scrollTo('bottom');

  // Wait for new images to load
  await waitFor(element(by.id('image-grid-footer-loading')))
    .not.toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify the image metadata overlay shows expected info.
 *
 * @param options - Fields to verify
 * @param options.senderName - Expected sender name
 * @param options.conversationName - Expected conversation name
 * @param options.timeout - Timeout for verification (default: 3000ms)
 */
export async function expectImageMetadata(
  options: {
    senderName?: string;
    conversationName?: string;
    timeout?: number;
  } = {}
) {
  const { senderName, conversationName, timeout = 3000 } = options;

  if (senderName) {
    await waitFor(element(by.text(senderName)))
      .toBeVisible()
      .withTimeout(timeout);
  }

  if (conversationName) {
    await waitFor(element(by.text(conversationName)))
      .toBeVisible()
      .withTimeout(timeout);
  }
}

/**
 * Verify a specific number of images are visible in the grid.
 *
 * @param count - Expected number of visible images
 * @param options - Optional configuration
 * @param options.timeout - Timeout for verification (default: 5000ms)
 */
export async function expectImageCount(count: number, options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  for (let i = 0; i < count; i++) {
    await waitFor(element(by.id(`image-grid-item-${i}`)))
      .toBeVisible()
      .withTimeout(timeout);
  }
}

/**
 * Verify the loading state is visible.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for verification (default: 3000ms)
 */
export async function expectLoadingState(options: { timeout?: number } = {}) {
  const { timeout = 3000 } = options;

  await waitFor(element(by.id('image-grid-loading')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify an error state is visible.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for verification (default: 3000ms)
 */
export async function expectErrorState(options: { timeout?: number } = {}) {
  const { timeout = 3000 } = options;

  await waitFor(element(by.id('image-grid-error')))
    .toBeVisible()
    .withTimeout(timeout);
}
