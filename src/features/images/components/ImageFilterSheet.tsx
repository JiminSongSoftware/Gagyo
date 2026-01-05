/**
 * Image Filter Sheet Component
 *
 * Bottom sheet for filtering images by conversation.
 * Features:
 * - List of conversations with images
 * - "All conversations" option
 * - Search functionality
 *
 * See: claude_docs/17_images_view.md for architecture documentation
 */

import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ListRenderItemInfo } from 'react-native';
import { Sheet, YStack, XStack, Stack, Text as TamaguiText, Spinner, Input } from 'tamagui';
import { useTranslation } from '@/i18n';

/**
 * Simplified conversation type for filter sheet
 */
export interface FilterConversation {
  id: string;
  name: string | null;
  type: string;
}

/**
 * Props for ImageFilterSheet component
 */
export interface ImageFilterSheetProps {
  /** Whether the sheet is visible */
  open: boolean;

  /** Callback when sheet visibility changes */
  onOpenChange: (open: boolean) => void;

  /** List of conversations available for filtering */
  conversations: FilterConversation[];

  /** Currently selected conversation ID (null for all) */
  selectedConversationId: string | null;

  /** Callback when a conversation is selected */
  onSelectConversation: (conversationId: string | null) => void;

  /** Whether conversations are loading */
  loading?: boolean;
}

/**
 * "All conversations" option item
 */
function AllConversationsItem({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  const { t } = useTranslation();

  return (
    <Pressable
      testID="filter-all-conversations"
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <XStack
        padding="$3"
        backgroundColor={selected ? '$primaryLight' : 'transparent'}
        borderRadius="$2"
        alignItems="center"
        gap="$3"
      >
        <Stack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
        >
          <TamaguiText color="white" fontSize={20}>
            📷
          </TamaguiText>
        </Stack>
        <YStack flex={1}>
          <TamaguiText fontSize="$md" fontWeight={selected ? '600' : '400'} color="$color">
            {t('images.all_conversations')}
          </TamaguiText>
        </YStack>
        {selected && (
          <TamaguiText color="$primary" fontSize="$lg">
            ✓
          </TamaguiText>
        )}
      </XStack>
    </Pressable>
  );
}

/**
 * Conversation item for the filter list
 */
function ConversationItem({
  conversation,
  selected,
  onPress,
}: {
  conversation: FilterConversation;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  const displayName = conversation.name ?? t('chat.unknown_conversation');

  // Get icon based on conversation type
  const getTypeIcon = () => {
    switch (conversation.type) {
      case 'direct':
        return '👤';
      case 'group':
        return '👥';
      case 'small_group':
        return '🏠';
      case 'ministry':
        return '⛪';
      default:
        return '💬';
    }
  };

  return (
    <Pressable
      testID={`filter-conversation-${conversation.id}`}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <XStack
        padding="$3"
        backgroundColor={selected ? '$primaryLight' : 'transparent'}
        borderRadius="$2"
        alignItems="center"
        gap="$3"
      >
        <Stack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor="$backgroundTertiary"
          alignItems="center"
          justifyContent="center"
        >
          <TamaguiText fontSize={18}>{getTypeIcon()}</TamaguiText>
        </Stack>
        <YStack flex={1}>
          <TamaguiText
            fontSize="$md"
            fontWeight={selected ? '600' : '400'}
            color="$color"
            numberOfLines={1}
          >
            {displayName}
          </TamaguiText>
        </YStack>
        {selected && (
          <TamaguiText color="$primary" fontSize="$lg">
            ✓
          </TamaguiText>
        )}
      </XStack>
    </Pressable>
  );
}

/**
 * ImageFilterSheet component allows users to filter the gallery by conversation.
 *
 * @example
 * ```tsx
 * function ImagesScreen() {
 *   const [filterOpen, setFilterOpen] = useState(false);
 *   const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
 *   const { conversations } = useConversations(tenantId, membershipId);
 *
 *   return (
 *     <>
 *       <ImageGrid ... />
 *       <ImageFilterSheet
 *         open={filterOpen}
 *         onOpenChange={setFilterOpen}
 *         conversations={conversations}
 *         selectedConversationId={selectedConversation}
 *         onSelectConversation={setSelectedConversation}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function ImageFilterSheet({
  open,
  onOpenChange,
  conversations,
  selectedConversationId,
  onSelectConversation,
  loading = false,
}: ImageFilterSheetProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }

    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => conv.name?.toLowerCase().includes(query));
  }, [conversations, searchQuery]);

  const handleSelectAll = useCallback(() => {
    onSelectConversation(null);
    onOpenChange(false);
  }, [onSelectConversation, onOpenChange]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      onSelectConversation(conversationId);
      onOpenChange(false);
    },
    [onSelectConversation, onOpenChange]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<FilterConversation>) => (
      <ConversationItem
        conversation={item}
        selected={selectedConversationId === item.id}
        onPress={() => handleSelectConversation(item.id)}
      />
    ),
    [selectedConversationId, handleSelectConversation]
  );

  const keyExtractor = useCallback((item: FilterConversation) => item.id, []);

  const ListHeaderComponent = useCallback(
    () => (
      <YStack gap="$2" marginBottom="$2">
        {/* Search input */}
        <Input
          testID="filter-search-input"
          placeholder={t('images.search_conversations') ?? 'Search conversations...'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          borderRadius="$2"
        />

        {/* All conversations option */}
        <AllConversationsItem
          selected={selectedConversationId === null}
          onPress={handleSelectAll}
        />

        {/* Separator */}
        <Stack height={1} backgroundColor="$borderLight" marginVertical="$2" />
      </YStack>
    ),
    [t, searchQuery, selectedConversationId, handleSelectAll]
  );

  const ListEmptyComponent = useCallback(
    () => (
      <YStack padding="$4" alignItems="center">
        <TamaguiText color="$color2" fontSize="$sm">
          {searchQuery ? t('images.no_matching_conversations') : t('images.no_conversations')}
        </TamaguiText>
      </YStack>
    ),
    [t, searchQuery]
  );

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[60]}
      dismissOnSnapToBottom
      dismissOnOverlayPress
    >
      <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
      <Sheet.Frame
        testID="image-filter-sheet"
        backgroundColor="$background"
        borderTopLeftRadius="$4"
        borderTopRightRadius="$4"
      >
        <Sheet.Handle />

        {/* Header */}
        <XStack
          padding="$4"
          paddingTop="$2"
          borderBottomWidth={1}
          borderBottomColor="$borderLight"
          alignItems="center"
          justifyContent="space-between"
        >
          <TamaguiText fontSize="$lg" fontWeight="600" color="$color">
            {t('images.filter_by_conversation')}
          </TamaguiText>
        </XStack>

        {/* Content */}
        <YStack flex={1} padding="$4">
          {loading ? (
            <YStack flex={1} alignItems="center" justifyContent="center">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : (
            <FlatList
              data={filteredConversations}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              ListHeaderComponent={ListHeaderComponent}
              ListEmptyComponent={ListEmptyComponent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
            />
          )}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
