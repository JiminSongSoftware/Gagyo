/**
 * Images screen.
 *
 * Displays a gallery grid of all images from conversations.
 * Features:
 * - Thumbnail grid with infinite scroll
 * - Full-screen image viewer with swipe navigation
 * - Conversation filter to narrow results
 *
 * See: claude_docs/17_images_view.md for architecture documentation
 */

import { useCallback, useState, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Stack, Text as TamaguiText, XStack } from 'tamagui';
import { Container } from '@/components/ui';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useCurrentMembership } from '@/hooks/useCurrentMembership';
import { useConversations } from '@/features/chat/hooks';
import { useImages } from '@/features/images/hooks';
import {
  ImageGrid,
  ImageViewer,
  ImageFilterSheet,
  type FilterConversation,
} from '@/features/images/components';
import { useTranslation } from '@/i18n';
import type { ImageAttachment } from '@/types/database';

/**
 * Header component with filter button
 */
function Header({
  selectedConversationName,
  onFilterPress,
}: {
  selectedConversationName: string | null;
  onFilterPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <XStack
      paddingHorizontal="$4"
      paddingVertical="$3"
      alignItems="center"
      justifyContent="space-between"
      borderBottomWidth={1}
      borderBottomColor="$borderLight"
    >
      <TamaguiText fontSize="$xl" fontWeight="700" color="$color">
        {t('images.title')}
      </TamaguiText>

      <Pressable
        testID="images-filter-button"
        accessibilityLabel={t('images.filter_by_conversation')}
        accessibilityRole="button"
        accessibilityState={{ expanded: false }}
        onPress={onFilterPress}
        style={({ pressed }) => [
          styles.filterButton,
          pressed && styles.filterButtonPressed,
          selectedConversationName && styles.filterButtonActive,
        ]}
      >
        <TamaguiText
          fontSize="$sm"
          color={selectedConversationName ? "$primary" : "$color3"}
          numberOfLines={1}
          style={styles.filterButtonText}
        >
          {selectedConversationName ?? t('images.all_conversations')}
        </TamaguiText>
        <TamaguiText
          fontSize="$xs"
          color={selectedConversationName ? "$primary" : "$color3"}
          marginLeft="$1"
        >
          ▼
        </TamaguiText>
      </Pressable>
    </XStack>
  );
}

export default function ImagesScreen() {
  const { t } = useTranslation();
  const { tenantId } = useRequireAuth();
  const { membershipId } = useCurrentMembership();

  // State for filter and viewer
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch conversations for filter
  const { conversations, loading: conversationsLoading } = useConversations(tenantId, membershipId);

  // Transform conversations to filter format
  const filterConversations: FilterConversation[] = useMemo(
    () =>
      conversations.map((conv) => ({
        id: conv.id,
        name: conv.name,
        type: conv.type,
      })),
    [conversations]
  );

  // Get selected conversation name for header
  const selectedConversationName = useMemo(() => {
    if (!selectedConversationId) return null;
    const conv = conversations.find((c) => c.id === selectedConversationId);
    return conv?.name ?? t('chat.unknown_conversation');
  }, [selectedConversationId, conversations, t]);

  // Fetch images with optional conversation filter
  const { images, loading, error, hasMore, loadMore, refresh } = useImages(tenantId, {
    conversationId: selectedConversationId,
  });

  // Handle image press to open viewer
  const handleImagePress = useCallback((_image: ImageAttachment, index: number) => {
    setSelectedImageIndex(index);
    setViewerVisible(true);
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    // Note: refresh doesn't return a promise, so we set a timeout to hide refreshing
    setTimeout(() => setRefreshing(false), 500);
  }, [refresh]);

  // Handle filter button press
  const handleFilterPress = useCallback(() => {
    setFilterOpen(true);
  }, []);

  // Handle conversation selection from filter
  const handleSelectConversation = useCallback((conversationId: string | null) => {
    setSelectedConversationId(conversationId);
  }, []);

  // Handle viewer close
  const handleCloseViewer = useCallback(() => {
    setViewerVisible(false);
  }, []);

  return (
    <>
      <Container testID="images-screen" flex={1}>
        {/* Header with filter */}
        <Header
          selectedConversationName={selectedConversationName}
          onFilterPress={handleFilterPress}
        />

        {/* Image grid */}
        <Stack flex={1}>
          <ImageGrid
            images={images}
            onImagePress={handleImagePress}
            onLoadMore={loadMore}
            loading={loading}
            hasMore={hasMore}
            error={error}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            filteredConversationId={selectedConversationId}
          />
        </Stack>
      </Container>

      {/* Image viewer modal - rendered outside Container to avoid SafeArea conflicts */}
      {viewerVisible && (
        <ImageViewer
          visible={viewerVisible}
          images={images}
          initialIndex={selectedImageIndex}
          onClose={handleCloseViewer}
        />
      )}

      {/* Filter sheet - always rendered so animation values initialize on app load */}
      <ImageFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        conversations={filterConversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        loading={conversationsLoading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'transparent',
    minWidth: 100,
  },
  filterButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  filterButtonPressed: {
    backgroundColor: '#F5F5F5',
    opacity: 0.9,
  },
  filterButtonText: {
    maxWidth: 150,
    flexShrink: 1,
  },
});
