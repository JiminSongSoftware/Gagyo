import { element, by, waitFor } from 'detox';

/**
 * Reusable helper functions for pastoral journal E2E tests.
 *
 * These functions encapsulate common pastoral journal actions to reduce
 * test code duplication and improve maintainability.
 */

/**
 * Navigate to the pastoral tab and verify it's visible.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 5000ms)
 */
export async function navigateToPastoral(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.text('Pastoral')).tap();

  await waitFor(element(by.id('pastoral-screen')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Tap the create journal FAB to open the creation screen.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for screen appearance (default: 5000ms)
 */
export async function openCreateJournal(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.id('create-journal-fab')).tap();

  await waitFor(element(by.id('create-journal-screen')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Navigate back from create journal screen.
 */
export async function navigateBackFromCreateJournal() {
  await element(by.id('back-button')).tap();

  await waitFor(element(by.id('pastoral-screen')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Type attendance data in the journal form.
 *
 * @param attendance - The attendance data
 */
export async function typeAttendance(attendance: {
  present: number;
  absent: number;
  newVisitors: number;
}) {
  const presentInput = element(by.id('attendance-present-input'));
  await presentInput.clearText();
  await presentInput.typeText(String(attendance.present));

  const absentInput = element(by.id('attendance-absent-input'));
  await absentInput.clearText();
  await absentInput.typeText(String(attendance.absent));

  const newVisitorsInput = element(by.id('attendance-new-visitors-input'));
  await newVisitorsInput.clearText();
  await newVisitorsInput.typeText(String(attendance.newVisitors));
}

/**
 * Type prayer requests in the journal form.
 *
 * @param prayerRequests - The prayer requests text
 */
export async function typePrayerRequests(prayerRequests: string) {
  const prayerRequestsInput = element(by.id('prayer-requests-input'));
  await prayerRequestsInput.clearText();
  await prayerRequestsInput.typeText(prayerRequests);
}

/**
 * Type highlights in the journal form.
 *
 * @param highlights - The highlights text
 */
export async function typeHighlights(highlights: string) {
  const highlightsInput = element(by.id('highlights-input'));
  await highlightsInput.clearText();
  await highlightsInput.typeText(highlights);
}

/**
 * Type concerns in the journal form.
 *
 * @param concerns - The concerns text
 */
export async function typeConcerns(concerns: string) {
  const concernsInput = element(by.id('concerns-input'));
  await concernsInput.clearText();
  await concernsInput.typeText(concerns);
}

/**
 * Type next steps in the journal form.
 *
 * @param nextSteps - The next steps text
 */
export async function typeNextSteps(nextSteps: string) {
  const nextStepsInput = element(by.id('next-steps-input'));
  await nextStepsInput.clearText();
  await nextStepsInput.typeText(nextSteps);
}

/**
 * Submit the journal creation form as draft.
 *
 * @param options - Optional configuration
 * @param options.expectSuccess - Whether to expect successful creation (default: true)
 * @param options.timeout - Timeout for creation (default: 10000ms)
 */
export async function saveJournalAsDraft(
  options: { expectSuccess?: boolean; timeout?: number } = {}
) {
  const { expectSuccess = true, timeout = 10000 } = options;

  await element(by.id('save-draft-button')).tap();

  if (expectSuccess) {
    // Verify navigate back to list
    await waitFor(element(by.id('pastoral-screen')))
      .toBeVisible()
      .withTimeout(timeout);
  }
}

/**
 * Submit the journal creation form and submit for review.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for creation (default: 10000ms)
 */
export async function saveAndSubmitJournal(options: { timeout?: number } = ({} = {})) {
  const { timeout = 10000 } = options;

  await element(by.id('save-and-submit-button')).tap();

  // Verify navigate back to list
  await waitFor(element(by.id('pastoral-screen')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Create a pastoral journal with the given content.
 *
 * @param content - The journal content
 * @param options - Optional configuration
 * @param options.submitForReview - Whether to submit for review (default: false)
 */
export async function createJournal(
  content: {
    attendance?: { present: number; absent: number; newVisitors: number };
    prayerRequests?: string;
    highlights?: string;
    concerns?: string;
    nextSteps?: string;
  },
  options: { submitForReview?: boolean; timeout?: number } = {}
) {
  const { submitForReview = false, timeout = 10000 } = options;

  await openCreateJournal();

  if (content.attendance) {
    await typeAttendance(content.attendance);
  }
  if (content.prayerRequests) {
    await typePrayerRequests(content.prayerRequests);
  }
  if (content.highlights) {
    await typeHighlights(content.highlights);
  }
  if (content.concerns) {
    await typeConcerns(content.concerns);
  }
  if (content.nextSteps) {
    await typeNextSteps(content.nextSteps);
  }

  if (submitForReview) {
    await saveAndSubmitJournal({ timeout });
  } else {
    await saveJournalAsDraft({ timeout });
  }
}

/**
 * Open a pastoral journal detail screen by tapping on it.
 *
 * @param journalId - The testID of the journal to open
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 5000ms)
 */
export async function openJournalDetail(journalId: string, options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.id(`journal-card-${journalId}`)).tap();

  await waitFor(element(by.id('journal-detail-screen')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Navigate back from journal detail to list.
 */
export async function navigateBackFromJournalDetail() {
  await element(by.id('back-button')).tap();

  await waitFor(element(by.id('pastoral-screen')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Submit journal for review from detail view.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for action (default: 5000ms)
 */
export async function submitJournalForReview(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.id('submit-for-review-button')).tap();

  // Confirm the action if dialog appears
  const confirmButton = element(by.id('confirm-submit-button'));
  if (await expect(confirmButton).toExist()) {
    await confirmButton.tap();
  }

  // Verify status changed
  await waitFor(element(by.id('status-submitted')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Add a comment to the journal.
 *
 * @param content - The comment content
 * @param options - Optional configuration
 * @param options.timeout - Timeout for action (default: 5000ms)
 */
export async function addComment(content: string, options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  const commentInput = element(by.id('comment-input'));
  await commentInput.typeText(content);

  await element(by.id('submit-comment-button')).tap();

  // Verify comment appears
  await waitFor(element(by.text(content)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Forward journal to pastor (zone leader action).
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for action (default: 5000ms)
 */
export async function forwardToPastor(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.id('forward-to-pastor-button')).tap();

  // Confirm the action if dialog appears
  const confirmButton = element(by.id('confirm-forward-button'));
  if (await expect(confirmButton).toExist()) {
    await confirmButton.tap();
  }

  // Verify status changed
  await waitFor(element(by.id('status-zone-reviewed')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Confirm journal (pastor action).
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for action (default: 5000ms)
 */
export async function confirmJournal(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.id('confirm-journal-button')).tap();

  // Confirm the action if dialog appears
  const confirmButton = element(by.id('confirm-confirm-button'));
  if (await expect(confirmButton).toExist()) {
    await confirmButton.tap();
  }

  // Verify status changed
  await waitFor(element(by.id('status-pastor-confirmed')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify the pastoral journal list is visible.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for list appearance (default: 5000ms)
 */
export async function expectJournalListVisible(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.id('pastoral-journal-list')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify the pastoral journal empty state is shown.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for empty state appearance (default: 5000ms)
 */
export async function expectJournalEmptyState(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.id('pastoral-empty-state')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify a journal card with specific content is visible in the list.
 *
 * @param content - The journal content to look for
 * @param options - Optional configuration
 * @param options.timeout - Timeout for card appearance (default: 5000ms)
 */
export async function expectJournalCardVisible(
  content: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.text(content)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify journal has specific status.
 *
 * @param status - The expected status ('draft', 'submitted', 'zone_reviewed', 'pastor_confirmed')
 */
export async function expectJournalStatus(
  status: 'draft' | 'submitted' | 'zone_reviewed' | 'pastor_confirmed'
) {
  await expect(element(by.id(`status-${status}`))).toBeVisible();
}

/**
 * Pull to refresh the journal list.
 */
export async function pullToRefresh() {
  await element(by.id('pastoral-journal-list')).swipe('down', 'fast', 0.5);

  // Wait for refresh to complete
  await waitFor(element(by.id('pastoral-journal-list')))
    .toBeVisible()
    .withTimeout(5000);
}

/**
 * Verify comment section is visible.
 */
export async function expectCommentSectionVisible() {
  await expect(element(by.id('comment-section'))).toBeVisible();
}

/**
 * Verify comment is visible.
 *
 * @param content - The comment content to look for
 */
export async function expectCommentVisible(content: string) {
  await expect(element(by.text(content))).toBeVisible();
}

/**
 * Select a filter tab on the journal list.
 *
 * @param filter - The filter to select: 'my_journals', 'submitted_journals', or 'all_journals'
 */
export async function selectFilter(filter: 'my_journals' | 'submitted_journals' | 'all_journals') {
  await element(by.id(`filter-${filter}`)).tap();

  // Wait for list to refresh
  await waitFor(element(by.id('pastoral-journal-list')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Verify a specific filter tab is selected.
 *
 * @param filter - The filter that should be selected
 */
export async function expectFilterSelected(
  filter: 'my_journals' | 'submitted_journals' | 'all_journals'
) {
  const filterTab = element(by.id(`filter-${filter}`));
  await expect(filterTab).toHaveLabel('selected');
}

/**
 * Verify action button is NOT visible (role-based access control).
 *
 * @param buttonId - The button ID to check
 */
export async function expectActionButtonNotVisible(buttonId: string) {
  await expect(element(by.id(buttonId))).not.toBeVisible();
}

/**
 * Scroll to load more journals (pagination test).
 */
export async function scrollToLoadMoreJournals() {
  await element(by.id('pastoral-journal-list')).scroll(500, 'down');
}
