import { element, by, waitFor } from 'detox';

/**
 * Reusable helper functions for prayer cards E2E tests.
 *
 * These functions encapsulate common prayer card actions to reduce
 * test code duplication and improve maintainability.
 */

/**
 * Navigate to the prayer tab and verify it's visible.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 5000ms)
 */
export async function navigateToPrayer(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.text('Prayer')).tap();

  await waitFor(element(by.id('prayer-screen')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Tap the create prayer FAB to open the creation modal.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for modal appearance (default: 5000ms)
 */
export async function openCreatePrayerModal(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.id('create-prayer-fab')).tap();

  await waitFor(element(by.id('create-prayer-modal')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Close the create prayer modal.
 */
export async function closeCreatePrayerModal() {
  await element(by.id('close-modal-button')).tap();

  await waitFor(element(by.id('create-prayer-modal')))
    .not.toBeVisible()
    .withTimeout(3000);
}

/**
 * Type prayer content in the text input.
 *
 * @param content - The prayer content text
 */
export async function typePrayerContent(content: string) {
  const contentInput = element(by.id('prayer-content-input'));
  await contentInput.clearText();
  await contentInput.typeText(content);
}

/**
 * Select a recipient scope option.
 *
 * @param scope - The scope to select: 'individual', 'small_group', or 'church_wide'
 */
export async function selectRecipientScope(scope: 'individual' | 'small_group' | 'church_wide') {
  await element(by.id(`recipient-scope-${scope}`)).tap();
}

/**
 * Submit the prayer card creation form.
 *
 * @param options - Optional configuration
 * @param options.expectSuccess - Whether to expect successful creation (default: true)
 * @param options.timeout - Timeout for creation (default: 10000ms)
 */
export async function submitPrayerCard(
  options: { expectSuccess?: boolean; timeout?: number } = {}
) {
  const { expectSuccess = true, timeout = 10000 } = options;

  await element(by.id('create-prayer-submit-button')).tap();

  if (expectSuccess) {
    // Verify modal closed
    await waitFor(element(by.id('create-prayer-modal')))
      .not.toBeVisible()
      .withTimeout(timeout);
  }
}

/**
 * Create a prayer card with the given content and scope.
 *
 * @param content - The prayer content
 * @param scope - The recipient scope
 * @param options - Optional configuration
 */
export async function createPrayerCard(
  content: string,
  scope: 'individual' | 'small_group' | 'church_wide',
  options: { timeout?: number } = {}
) {
  const { timeout = 10000 } = options;

  await openCreatePrayerModal();
  await typePrayerContent(content);
  await selectRecipientScope(scope);
  await submitPrayerCard({ timeout });
}

/**
 * Select a filter tab on the prayer list.
 *
 * @param filter - The filter to select: 'my_prayers', 'received_prayers', or 'all_prayers'
 */
export async function selectFilter(filter: 'my_prayers' | 'received_prayers' | 'all_prayers') {
  await element(by.id(`filter-${filter}`)).tap();

  // Wait for list to refresh
  await waitFor(element(by.id('prayer-list')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Open a prayer card detail screen by tapping on it.
 *
 * @param prayerCardId - The testID of the prayer card to open
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 5000ms)
 */
export async function openPrayerDetail(prayerCardId: string, options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.id(`prayer-card-${prayerCardId}`)).tap();

  await waitFor(element(by.id('prayer-detail-screen')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Navigate back from prayer detail to prayer list.
 */
export async function navigateBackToList() {
  await element(by.id('back-button')).tap();

  await waitFor(element(by.id('prayer-screen')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Mark a prayer card as answered.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for action completion (default: 5000ms)
 */
export async function markAsAnswered(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.id('mark-answered-button')).tap();

  // Verify answered state
  await waitFor(element(by.id('answered-badge')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Unmark a prayer card as answered.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for action completion (default: 5000ms)
 */
export async function unmarkAsAnswered(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.id('mark-answered-button')).tap();

  // Verify unmarked state
  await waitFor(element(by.id('unanswered-badge')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Open the prayer analytics sheet.
 */
export async function openAnalytics() {
  await element(by.id('analytics-button')).tap();

  await waitFor(element(by.id('prayer-analytics-sheet')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Close the prayer analytics sheet.
 */
export async function closeAnalytics() {
  await element(by.id('close-analytics-button')).tap();

  await waitFor(element(by.id('prayer-analytics-sheet')))
    .not.toBeVisible()
    .withTimeout(3000);
}

/**
 * Verify the prayer list is visible.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for list appearance (default: 5000ms)
 */
export async function expectPrayerListVisible(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.id('prayer-list')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify the prayer empty state is shown.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for empty state appearance (default: 5000ms)
 */
export async function expectPrayerEmptyState(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.id('prayer-empty-state')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify a prayer card with specific content is visible in the list.
 *
 * @param content - The prayer content to look for
 * @param options - Optional configuration
 * @param options.timeout - Timeout for card appearance (default: 5000ms)
 */
export async function expectPrayerCardVisible(content: string, options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.text(content)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Scroll to load more prayer cards (pagination test).
 */
export async function scrollToLoadMorePrayers() {
  await element(by.id('prayer-list')).scroll(500, 'down');
}

/**
 * Verify the analytics stats are displayed.
 *
 * @param stats - Object containing expected stats
 * @param stats.totalPrayers - Expected total prayers count
 * @param stats.answeredPrayers - Expected answered prayers count
 * @param stats.answerRate - Expected answer rate percentage
 */
export async function expectAnalyticsStats(stats: {
  totalPrayers?: number;
  answeredPrayers?: number;
  answerRate?: number;
}) {
  if (stats.totalPrayers !== undefined) {
    await expect(element(by.id('stat-total-prayers'))).toHaveText(String(stats.totalPrayers));
  }

  if (stats.answeredPrayers !== undefined) {
    await expect(element(by.id('stat-answered-prayers'))).toHaveText(String(stats.answeredPrayers));
  }

  if (stats.answerRate !== undefined) {
    await expect(element(by.id('stat-answer-rate'))).toHaveText(`${stats.answerRate}%`);
  }
}

/**
 * Toggle background music on/off.
 */
export async function toggleBackgroundMusic() {
  await element(by.id('background-music-toggle')).tap();
}

/**
 * Verify background music is enabled.
 */
export async function expectBackgroundMusicEnabled() {
  await expect(element(by.id('background-music-toggle'))).toHaveLabel(
    'prayer.background_music_enabled'
  );
}

/**
 * Verify background music is disabled.
 */
export async function expectBackgroundMusicDisabled() {
  await expect(element(by.id('background-music-toggle'))).toHaveLabel(
    'prayer.background_music_disabled'
  );
}

/**
 * Verify a specific filter tab is selected.
 *
 * @param filter - The filter that should be selected
 */
export async function expectFilterSelected(
  filter: 'my_prayers' | 'received_prayers' | 'all_prayers'
) {
  const filterTab = element(by.id(`filter-${filter}`));
  await expect(filterTab).toHaveLabel('selected');
}

/**
 * Pull to refresh the prayer list.
 */
export async function pullToRefresh() {
  await element(by.id('prayer-list')).swipe('down', 'fast', 0.5);

  // Wait for refresh to complete
  await waitFor(element(by.id('prayer-list')))
    .toBeVisible()
    .withTimeout(5000);
}
