/**
 * Image Grid Component
 *
 * Displays images in a virtualized 3-column grid with thumbnail support.
 * Handles loading states, empty states, and infinite scroll pagination.
 *
 * See: claude_docs/17_images_view.md for architecture documentation
 */

import { useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  Image,
  useWindowDimensions,
  StyleSheet,
  ListRenderItemInfo,
  View,
} from 'react-native';
import { Stack, Text as TamaguiText } from 'tamagui';
import { useTranslation } from '@/i18n';
import type { ImageAttachment } from '@/types/database';

/**
 * Number of columns in the grid
 */
const NUM_COLUMNS = 3;

/**
 * Gap between grid items in pixels
 */
const GRID_GAP = 2;

/**
 * Props for ImageGrid component
 */
export interface ImageGridProps {
  /** Array of images to display */
  images: ImageAttachment[];

  /** Callback when an image is pressed */
  onImagePress: (image: ImageAttachment, index: number) => void;

  /** Callback to load more images for pagination */
  onLoadMore?: () => void;

  /** Whether data is being loaded */
  loading: boolean;

  /** Whether there are more images to load */
  hasMore: boolean;

  /** Error state */
  error?: Error | null;

  /** Callback for pull-to-refresh */
  onRefresh?: () => void;

  /** Whether the list is currently refreshing */
  refreshing?: boolean;

  /** ID of the conversation being filtered (null for all conversations) */
  filteredConversationId?: string | null;
}

/**
 * Skeleton item for loading state
 */
function SkeletonItem({ itemSize }: { itemSize: number }) {
  return (
    <View
      style={[
        styles.skeletonItem,
        {
          width: itemSize,
          height: itemSize,
        },
      ]}
    />
  );
}

/**
 * Loading skeleton grid - maintains grid layout during initial load
 */
function LoadingSkeleton({ itemSize }: { itemSize: number }) {
  // Generate 12 skeleton items for visual feedback
  const skeletonData = Array.from({ length: 12 }, (_, i) => i);

  return (
    <FlatList
      testID="image-grid-loading-skeleton"
      data={skeletonData}
      renderItem={() => <SkeletonItem itemSize={itemSize} />}
      keyExtractor={(item) => `skeleton-${item}`}
      numColumns={NUM_COLUMNS}
      columnWrapperStyle={[styles.columnWrapper, { marginHorizontal: GRID_GAP }]}
      contentContainerStyle={styles.contentContainer}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

/**
 * Empty state component when no images exist
 */
function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  const { t } = useTranslation();

  return (
    <Stack
      testID={isFiltered ? "image-grid-filter-empty" : "image-grid-empty"}
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$3"
    >
      <TamaguiText fontSize={48}>{isFiltered ? '📷' : '🖼️'}</TamaguiText>
      <TamaguiText fontSize="$lg" fontWeight="600" color="$color1" textAlign="center">
        {isFiltered
          ? t('images.filter_empty_state')
          : t('images.empty_state')}
      </TamaguiText>
      <TamaguiText fontSize="$md" color="$color2" textAlign="center">
        {isFiltered
          ? t('images.filter_empty_state_description')
          : t('images.empty_state_description')}
      </TamaguiText>
    </Stack>
  );
}

/**
 * Error state component
 */
function ErrorState({ error }: { error: Error }) {
  const { t } = useTranslation();

  return (
    <Stack
      testID="image-grid-error"
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$3"
    >
      <TamaguiText fontSize={48}>⚠️</TamaguiText>
      <TamaguiText fontSize="$lg" fontWeight="600" color="$danger" textAlign="center">
        {t('error')}
      </TamaguiText>
      <TamaguiText fontSize="$md" color="$color2" textAlign="center">
        {error.message}
      </TamaguiText>
    </Stack>
  );
}

/**
 * Footer component showing loading indicator for pagination
 */
function ListFooter({ loading, hasMore }: { loading: boolean; hasMore: boolean }) {
  if (!hasMore) {
    return null;
  }

  if (loading) {
    return (
      <Stack testID="image-grid-footer-loading" padding="$4" alignItems="center">
        <TamaguiText fontSize="$sm" color="$color3">
          Loading more...
        </TamaguiText>
      </Stack>
    );
  }

  return null;
}

/**
 * Image thumbnail item component with subtle pressed state
 */
function ImageThumbnail({
  image,
  index,
  itemSize,
  onPress,
}: {
  image: ImageAttachment;
  index: number;
  itemSize: number;
  onPress: (image: ImageAttachment, index: number) => void;
}) {
  const handlePress = useCallback(() => {
    onPress(image, index);
  }, [image, index, onPress]);

  return (
    <Pressable
      testID={`image-grid-item-${index}`}
      onPress={handlePress}
      accessibilityRole="imagebutton"
      accessibilityLabel={`View photo ${index + 1}`}
      style={({ pressed }) => [
        styles.thumbnailContainer,
        { width: itemSize, height: itemSize },
        pressed && styles.thumbnailPressed,
      ]}
    >
      <Image
        source={{ uri: image.url }}
        style={styles.thumbnailImage}
        resizeMode="cover"
      />
    </Pressable>
  );
}

/**
 * ImageGrid component displays images in a virtualized 3-column grid.
 *
 * @example
 * ```tsx
 * function ImagesScreen() {
 *   const { images, loading, hasMore, loadMore, error } = useImages(tenantId);
 *   const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
 *   const [selectedImage, setSelectedImage] = useState<ImageAttachment | null>(null);
 *
 *   const handleImagePress = (image: ImageAttachment) => {
 *     setSelectedImage(image);
 *   };
 *
 *   return (
 *     <ImageGrid
 *       images={images}
 *       onImagePress={handleImagePress}
 *       onLoadMore={loadMore}
 *       loading={loading}
 *       hasMore={hasMore}
 *       error={error}
 *       filteredConversationId={selectedConversation}
 *     />
 *   );
 * }
 * ```
 */
export function ImageGrid({
  images,
  onImagePress,
  onLoadMore,
  loading,
  hasMore,
  error,
  onRefresh,
  refreshing = false,
  filteredConversationId = null,
}: ImageGridProps) {
  const { width: windowWidth } = useWindowDimensions();

  // Calculate item size based on screen width
  const itemSize = useMemo(() => {
    const totalGap = GRID_GAP * (NUM_COLUMNS + 1);
    return Math.floor((windowWidth - totalGap) / NUM_COLUMNS);
  }, [windowWidth]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ImageAttachment>) => (
      <ImageThumbnail image={item} index={index} itemSize={itemSize} onPress={onImagePress} />
    ),
    [itemSize, onImagePress]
  );

  const keyExtractor = useCallback((item: ImageAttachment) => item.id, []);

  const handleEndReached = useCallback(() => {
    if (!loading && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  const ListFooterComponent = useCallback(
    () => <ListFooter loading={loading} hasMore={hasMore} />,
    [loading, hasMore]
  );

  // Show loading skeleton on initial load
  if (loading && images.length === 0) {
    return <LoadingSkeleton itemSize={itemSize} />;
  }

  // Show error state
  if (error && images.length === 0) {
    return <ErrorState error={error} />;
  }

  // Show empty state (with filter-specific message if applicable)
  if (!loading && images.length === 0) {
    return <EmptyState isFiltered={filteredConversationId !== null} />;
  }

  return (
    <FlatList
      testID="image-grid"
      data={images}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={NUM_COLUMNS}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={ListFooterComponent}
      refreshing={refreshing}
      onRefresh={onRefresh}
      columnWrapperStyle={styles.columnWrapper}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    padding: GRID_GAP,
  },
  columnWrapper: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  skeletonItem: {
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  thumbnailContainer: {
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbnailPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
});
