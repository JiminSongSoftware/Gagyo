/**
 * Image Viewer Component
 *
 * Full-screen image viewer with swipe navigation between images.
 * Features:
 * - Full-screen modal display
 * - Swipe left/right navigation
 * - Close button
 * - Image metadata overlay (sender, date, conversation)
 *
 * See: claude_docs/17_images_view.md for architecture documentation
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Image,
  Pressable,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  ListRenderItemInfo,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Stack, Text as TamaguiText, YStack } from 'tamagui';
import { useTranslation } from '@/i18n';
import { format } from 'date-fns';
import type { ImageAttachment } from '@/types/database';

/**
 * Props for ImageViewer component
 */
export interface ImageViewerProps {
  /** Whether the viewer is visible */
  visible: boolean;

  /** Array of images available for viewing */
  images: ImageAttachment[];

  /** Index of the initially selected image */
  initialIndex: number;

  /** Callback when viewer is closed */
  onClose: () => void;

  /** Callback when a different image is viewed */
  onIndexChange?: (index: number) => void;
}

/**
 * Close button component
 */
function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      testID="image-viewer-close"
      onPress={onPress}
      style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
    >
      <TamaguiText fontSize={24} color="white">
        ✕
      </TamaguiText>
    </Pressable>
  );
}

/**
 * Image metadata overlay showing sender, date, and conversation info
 */
function MetadataOverlay({
  image,
  currentIndex,
  totalCount,
}: {
  image: ImageAttachment;
  currentIndex: number;
  totalCount: number;
}) {
  const { t } = useTranslation();

  const formattedDate = useMemo(() => {
    try {
      return format(new Date(image.createdAt), 'PPp');
    } catch {
      return image.createdAt;
    }
  }, [image.createdAt]);

  const senderName = image.message.sender.displayName ?? t('chat.unknown_sender');
  const conversationName = image.message.conversation.name ?? t('chat.unknown_conversation');

  return (
    <YStack
      testID="image-viewer-metadata"
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      padding="$4"
      paddingBottom="$6"
      backgroundColor="rgba(0, 0, 0, 0.6)"
    >
      {/* Counter */}
      <TamaguiText fontSize="$sm" color="white" opacity={0.8} textAlign="center" marginBottom="$2">
        {currentIndex + 1} / {totalCount}
      </TamaguiText>

      {/* Sender */}
      <TamaguiText fontSize="$md" fontWeight="600" color="white">
        {senderName}
      </TamaguiText>

      {/* Conversation */}
      <TamaguiText fontSize="$sm" color="white" opacity={0.8} marginTop="$1">
        {conversationName}
      </TamaguiText>

      {/* Date */}
      <TamaguiText
        testID="image-viewer-timestamp"
        fontSize="$sm"
        color="white"
        opacity={0.6}
        marginTop="$1"
      >
        {formattedDate}
      </TamaguiText>
    </YStack>
  );
}

/**
 * Single image view item for the FlatList
 */
function ImageViewItem({
  image,
  width,
  height,
}: {
  image: ImageAttachment;
  width: number;
  height: number;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <Stack width={width} height={height} alignItems="center" justifyContent="center">
      {loading && !error && (
        <Stack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems="center"
          justifyContent="center"
        >
          <TamaguiText color="white" opacity={0.6}>
            Loading...
          </TamaguiText>
        </Stack>
      )}

      {error && (
        <Stack alignItems="center" justifyContent="center" padding="$4">
          <TamaguiText fontSize={48}>⚠️</TamaguiText>
          <TamaguiText color="white" marginTop="$2">
            Failed to load image
          </TamaguiText>
        </Stack>
      )}

      <Image
        source={{ uri: image.url }}
        style={[styles.fullImage, { width, height }]}
        resizeMode="contain"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </Stack>
  );
}

/**
 * ImageViewer component provides a full-screen image viewing experience.
 *
 * Features:
 * - Horizontal swipe navigation between images
 * - Close button to dismiss the viewer
 * - Metadata overlay showing image details
 * - Image counter (current / total)
 *
 * @example
 * ```tsx
 * function ImagesScreen() {
 *   const [viewerVisible, setViewerVisible] = useState(false);
 *   const [selectedIndex, setSelectedIndex] = useState(0);
 *   const { images } = useImages(tenantId);
 *
 *   const handleImagePress = (image: ImageAttachment, index: number) => {
 *     setSelectedIndex(index);
 *     setViewerVisible(true);
 *   };
 *
 *   return (
 *     <>
 *       <ImageGrid images={images} onImagePress={handleImagePress} />
 *       <ImageViewer
 *         visible={viewerVisible}
 *         images={images}
 *         initialIndex={selectedIndex}
 *         onClose={() => setViewerVisible(false)}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function ImageViewer({
  visible,
  images,
  initialIndex,
  onClose,
  onIndexChange,
}: ImageViewerProps) {
  const { width, height } = useWindowDimensions();
  const flatListRef = useRef<FlatList<ImageAttachment>>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Handle scroll end to update current index
  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / width);

      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < images.length) {
        setCurrentIndex(newIndex);
        onIndexChange?.(newIndex);
      }
    },
    [width, currentIndex, images.length, onIndexChange]
  );

  // Scroll to initial index when modal opens
  const handleLayout = useCallback(() => {
    if (flatListRef.current && initialIndex > 0) {
      flatListRef.current.scrollToIndex({
        index: initialIndex,
        animated: false,
      });
    }
  }, [initialIndex]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ImageAttachment>) => (
      <ImageViewItem image={item} width={width} height={height} />
    ),
    [width, height]
  );

  const keyExtractor = useCallback((item: ImageAttachment) => item.id, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<ImageAttachment> | null | undefined, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width]
  );

  const currentImage = images[currentIndex];

  if (!visible || images.length === 0) {
    return null;
  }

  return (
    <Modal
      testID="image-viewer"
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" />

        {/* Close button */}
        <CloseButton onPress={onClose} />

        {/* Image carousel */}
        <FlatList
          ref={flatListRef}
          testID="image-viewer-carousel"
          data={images}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onLayout={handleLayout}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialIndex}
          style={styles.flatList}
        />

        {/* Metadata overlay */}
        {currentImage && (
          <MetadataOverlay
            image={currentImage}
            currentIndex={currentIndex}
            totalCount={images.length}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  flatList: {
    flex: 1,
  },
  fullImage: {
    flex: 1,
  },
});
