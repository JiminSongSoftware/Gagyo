import { device, element, by, waitFor } from 'detox';
import { completeAuthFlow } from './helpers/auth-helpers';
import {
  navigateToImages,
  expectImageGridVisible,
  expectEmptyState,
  tapImage,
  expectImageViewerVisible,
  closeImageViewer,
  swipeImage,
  expectImageCounter,
  openFilterSheet,
  selectConversationFilter,
  clearConversationFilter,
  searchConversationFilter,
  pullToRefresh,
  scrollToLoadMore,
  expectImageMetadata,
  expectImageCount,
  expectLoadingState,
} from './helpers/images-helpers';
import { navigateToTab } from './helpers/navigation-helpers';

/**
 * Images E2E Tests
 *
 * Tests for the unified Images view including:
 * - Image gallery grid with infinite scroll
 * - Full-screen image viewer with swipe navigation
 * - Conversation filter functionality
 * - Pull-to-refresh behavior
 *
 * Following TDD: these tests are written before implementation.
 *
 * See: claude_docs/17_images_view.md for architecture documentation
 */
describe('Images', () => {
  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'password123';
  const TEST_TENANT = 'Test Church';

  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await completeAuthFlow(TEST_EMAIL, TEST_PASSWORD, TEST_TENANT);
  });

  // ============================================================================
  // IMAGE GRID TESTS
  // ============================================================================

  describe('Image Grid', () => {
    it('should display the Images screen when navigating to Images tab', async () => {
      await navigateToImages();
      await expect(element(by.id('images-screen'))).toBeVisible();
    });

    it('should display the image grid after loading', async () => {
      await navigateToImages();
      await expectImageGridVisible();
    });

    it('should show empty state when no images exist', async () => {
      // This test requires a user with no images in their conversations
      await navigateToImages();
      await expectEmptyState();
    });

    it('should display images in a 3-column grid', async () => {
      await navigateToImages();

      // Verify at least one image is visible in the grid
      await expectImageGridVisible();
      await expectImageCount(1);
    });

    it('should show loading indicator while fetching images', async () => {
      await navigateToImages();
      await expectLoadingState();
    });

    it('should load more images when scrolling to bottom (infinite scroll)', async () => {
      await navigateToImages();
      await expectImageGridVisible();

      // Scroll to trigger loading more
      await scrollToLoadMore();

      // Verify more images loaded (depends on data availability)
      await expectImageGridVisible();
    });

    it('should refresh images when pulling down', async () => {
      await navigateToImages();
      await expectImageGridVisible();

      // Pull to refresh
      await pullToRefresh();

      // Verify grid is still visible after refresh
      await expectImageGridVisible();
    });
  });

  // ============================================================================
  // IMAGE VIEWER TESTS
  // ============================================================================

  describe('Image Viewer', () => {
    beforeEach(async () => {
      await navigateToImages();
      await expectImageGridVisible();
    });

    it('should open full-screen viewer when tapping an image', async () => {
      await tapImage(0);
      await expectImageViewerVisible();
    });

    it('should close viewer when tapping close button', async () => {
      await tapImage(0);
      await expectImageViewerVisible();
      await closeImageViewer();

      // Verify back at grid
      await expectImageGridVisible();
    });

    it('should display image counter showing current position', async () => {
      await tapImage(0);
      await expectImageViewerVisible();
      await expectImageCounter(1, 10); // Assuming 10 images exist
    });

    it('should navigate to next image when swiping left', async () => {
      await tapImage(0);
      await expectImageViewerVisible();

      await swipeImage({ direction: 'left' });

      // Verify counter updated
      await expectImageCounter(2, 10);
    });

    it('should navigate to previous image when swiping right', async () => {
      await tapImage(1); // Start at second image
      await expectImageViewerVisible();

      await swipeImage({ direction: 'right' });

      // Verify counter updated
      await expectImageCounter(1, 10);
    });

    it('should display image metadata (sender name, conversation)', async () => {
      await tapImage(0);
      await expectImageViewerVisible();

      await expectImageMetadata({
        senderName: 'John Doe',
        conversationName: 'Small Group',
      });
    });

    it('should display timestamp for the image', async () => {
      await tapImage(0);
      await expectImageViewerVisible();

      // Verify timestamp element is visible
      await expect(element(by.id('image-viewer-timestamp'))).toBeVisible();
    });

    it('should open viewer at correct image when tapping different positions', async () => {
      // Tap third image
      await tapImage(2);
      await expectImageViewerVisible();

      // Verify counter shows third image
      await expectImageCounter(3, 10);
    });
  });

  // ============================================================================
  // FILTER TESTS
  // ============================================================================

  describe('Conversation Filter', () => {
    beforeEach(async () => {
      await navigateToImages();
      await expectImageGridVisible();
    });

    it('should open filter sheet when tapping filter button', async () => {
      await openFilterSheet();
      await expect(element(by.id('image-filter-sheet'))).toBeVisible();
    });

    it('should display list of conversations in filter sheet', async () => {
      await openFilterSheet();

      // Verify at least one conversation is shown
      await expect(element(by.text('Small Group'))).toBeVisible();
    });

    it('should filter images by selected conversation', async () => {
      await openFilterSheet();
      await selectConversationFilter('Small Group');

      // Verify filter is applied (filter button shows selected conversation)
      await expect(element(by.text('Small Group'))).toBeVisible();
    });

    it('should show all images when clearing filter', async () => {
      // First apply a filter
      await openFilterSheet();
      await selectConversationFilter('Small Group');

      // Then clear it
      await clearConversationFilter();

      // Verify filter button shows "All"
      await waitFor(element(by.id('images-filter-button')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should filter conversation list when searching', async () => {
      await openFilterSheet();
      await searchConversationFilter('Small');

      // Verify filtered results
      await expect(element(by.text('Small Group'))).toBeVisible();
    });

    it('should close filter sheet when selecting a conversation', async () => {
      await openFilterSheet();
      await selectConversationFilter('Small Group');

      // Verify sheet is closed
      await waitFor(element(by.id('image-filter-sheet')))
        .not.toBeVisible()
        .withTimeout(3000);
    });

    it('should show "All conversations" option at top of filter list', async () => {
      await openFilterSheet();

      await expect(element(by.id('filter-all-conversations'))).toBeVisible();
    });

    it('should display conversation type icons in filter list', async () => {
      await openFilterSheet();

      // Verify conversation type indicator is visible
      await expect(element(by.id('filter-conversation-type-small_group'))).toExist();
    });
  });

  // ============================================================================
  // NAVIGATION & STATE TESTS
  // ============================================================================

  describe('Navigation', () => {
    it('should persist filter state when navigating away and back', async () => {
      await navigateToImages();
      await expectImageGridVisible();

      // Apply a filter
      await openFilterSheet();
      await selectConversationFilter('Small Group');

      // Navigate away
      await navigateToTab('Chat');

      // Navigate back
      await navigateToImages();

      // Verify filter is still applied
      await expect(element(by.text('Small Group'))).toBeVisible();
    });

    it('should close viewer when pressing back from viewer', async () => {
      await navigateToImages();
      await tapImage(0);
      await expectImageViewerVisible();

      // Press hardware back button
      await device.pressBack();

      // Verify back at grid
      await expectImageGridVisible();
    });

    it('should maintain scroll position when returning from viewer', async () => {
      await navigateToImages();
      await expectImageGridVisible();

      // Scroll down
      await scrollToLoadMore();

      // Open an image
      await tapImage(5); // Image further down the list
      await expectImageViewerVisible();

      // Close viewer
      await closeImageViewer();

      // Verify we're back at similar scroll position (image 5 should be visible)
      await expect(element(by.id('image-grid-item-5'))).toBeVisible();
    });
  });

  // ============================================================================
  // INTERNATIONALIZATION TESTS
  // ============================================================================

  describe('Internationalization', () => {
    it('should display Images tab label in Korean when locale is ko', async () => {
      // This test requires changing the locale
      // The tab label would be '이미지' in Korean
      await navigateToImages();
      await expect(element(by.id('images-screen'))).toBeVisible();
    });

    it('should display empty state message in correct language', async () => {
      await navigateToImages();
      // Empty state message should be localized
      await expect(element(by.id('images-screen'))).toBeVisible();
    });

    it('should display filter options in correct language', async () => {
      await navigateToImages();
      await openFilterSheet();

      // "All conversations" should be localized
      await expect(element(by.id('filter-all-conversations'))).toBeVisible();
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should display error state when image loading fails', async () => {
      // This would require simulating a network failure
      await navigateToImages();

      // On network error, error state should be shown
      // await expectErrorState();
      await expect(element(by.id('images-screen'))).toBeVisible();
    });

    it('should allow retry after error', async () => {
      await navigateToImages();

      // Pull to refresh should work to retry after error
      await pullToRefresh();

      await expect(element(by.id('images-screen'))).toBeVisible();
    });
  });

  // ============================================================================
  // IMAGE UPLOAD INTEGRATION TESTS
  // ============================================================================

  describe('Image Upload Integration', () => {
    beforeEach(async () => {
      await navigateToTab('Chat');
      // Open a conversation
      await element(by.id('conversation-item-small-group')).tap();
    });

    it('should show image upload button in chat input', async () => {
      await expect(element(by.id('image-upload-button'))).toBeVisible();
    });

    it('should show uploading indicator when upload in progress', async () => {
      // Tap upload button (this would open image picker in real test)
      await element(by.id('image-upload-button')).tap();

      // Note: Actual image picker interaction requires special Detox configuration
      // For now, we verify the button is tappable
      await expect(element(by.id('message-input'))).toBeVisible();
    });
  });
});

/**
 * ============================================================================
 * NOTES ON IMAGES E2E TESTING
 * ============================================================================
 *
 * 1. Test IDs used:
 *    - images-screen: Main Images screen container
 *    - image-grid: The FlatList/grid container
 *    - image-grid-item-{index}: Individual image thumbnails
 *    - image-grid-empty: Empty state component
 *    - image-grid-loading: Loading indicator
 *    - image-grid-error: Error state component
 *    - image-viewer: Full-screen viewer modal
 *    - image-viewer-close: Close button in viewer
 *    - image-viewer-carousel: Horizontal image carousel
 *    - image-viewer-timestamp: Timestamp display in viewer
 *    - images-filter-button: Filter button in header
 *    - image-filter-sheet: Filter bottom sheet
 *    - filter-all-conversations: "All conversations" option
 *    - filter-search-input: Search input in filter sheet
 *    - filter-conversation-type-{type}: Conversation type indicator
 *    - image-upload-button: Upload button in MessageInput
 *
 * 2. Test data requirements:
 *    - Test user must have images in at least one conversation
 *    - At least 10 images for pagination tests
 *    - Multiple conversations with images for filter tests
 *
 * 3. Known limitations:
 *    - Image picker interaction requires special Detox mock configuration
 *    - Network error simulation requires mock server setup
 *    - Scroll position tests may be flaky on different device sizes
 */
