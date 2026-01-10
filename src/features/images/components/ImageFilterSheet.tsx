/**
 * Image Filter Sheet Component
 *
 * Bottom sheet for filtering images by conversation.
 * Features:
 * - List of conversations with images
 * - "All conversations" option
 * - Search functionality with sticky header
 * - Modern, polished design
 *
 * See: claude_docs/17_images_view.md for architecture documentation
 */

import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ListRenderItemInfo,
  Modal,
  StyleSheet,
  Dimensions,
  View,
} from 'react-native';
import { YStack, XStack, Stack, Text as TamaguiText, Input, Spinner } from 'tamagui';
import { useTranslation } from '@/i18n';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

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
 * Drag handle indicator at the top of the sheet
 */
function DragHandle() {
  return (
    <Stack alignItems="center" paddingTop="$3" paddingBottom="$2">
      <Stack width={36} height={4} borderRadius={2} backgroundColor="#E0E0E0" />
    </Stack>
  );
}

/**
 * "All conversations" option item with modern styling
 */
function AllConversationsItem({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  const { t } = useTranslation();

  return (
    <Pressable
      testID="filter-all-conversations"
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.itemContainer,
        pressed && styles.itemPressed,
        selected && styles.itemSelected,
      ]}
    >
      <Stack
        width={44}
        height={44}
        borderRadius={22}
        backgroundColor={selected ? '#007AFF' : '#F3F4F6'}
        alignItems="center"
        justifyContent="center"
      >
        {selected ? (
          <TamaguiText fontSize={20} color="#fff">
            ✓
          </TamaguiText>
        ) : (
          <TamaguiText fontSize={22}>📷</TamaguiText>
        )}
      </Stack>
      <TamaguiText
        fontSize={16}
        fontWeight={selected ? '600' : '400'}
        color={selected ? '#007AFF' : '#1C1C1E'}
        flex={1}
      >
        {t('images.all_conversations')}
      </TamaguiText>
      {selected && (
        <Stack width={20} height={20} borderRadius={10} backgroundColor="#007AFF" alignItems="center" justifyContent="center">
          <TamaguiText fontSize={12} color="#fff" fontWeight="600">
            ✓
          </TamaguiText>
        </Stack>
      )}
    </Pressable>
  );
}

/**
 * Conversation item with modern styling
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

  // Get icon and color based on conversation type
  const getTypeIcon = () => {
    switch (conversation.type) {
      case 'direct':
        return { icon: '👤', color: '#8B5CF6' };
      case 'group':
        return { icon: '👥', color: '#3B82F6' };
      case 'small_group':
        return { icon: '🏠', color: '#10B981' };
      case 'ministry':
        return { icon: '⛪', color: '#F59E0B' };
      default:
        return { icon: '💬', color: '#6B7280' };
    }
  };

  const { icon, color } = getTypeIcon();

  return (
    <Pressable
      testID={`filter-conversation-${conversation.id}`}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={displayName}
      style={({ pressed }) => [
        styles.itemContainer,
        pressed && styles.itemPressed,
        selected && styles.itemSelected,
      ]}
    >
      <Stack
        width={44}
        height={44}
        borderRadius={22}
        backgroundColor={selected ? '#007AFF' : (color + '15' as any)}
        alignItems="center"
        justifyContent="center"
      >
        {selected ? (
          <TamaguiText fontSize={20} color="#fff">
            ✓
          </TamaguiText>
        ) : (
          <TamaguiText fontSize={20}>{icon}</TamaguiText>
        )}
      </Stack>
      <TamaguiText
        fontSize={16}
        fontWeight={selected ? '600' : '400'}
        color={selected ? '#007AFF' : '#1C1C1E'}
        flex={1}
        numberOfLines={1}
      >
        {displayName}
      </TamaguiText>
      {selected && (
        <Stack width={20} height={20} borderRadius={10} backgroundColor="#007AFF" alignItems="center" justifyContent="center">
          <TamaguiText fontSize={12} color="#fff" fontWeight="600">
            ✓
          </TamaguiText>
        </Stack>
      )}
    </Pressable>
  );
}

/**
 * Search input with modern styling
 */
function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <XStack alignItems="center" backgroundColor="#F3F4F6" borderRadius={12} paddingHorizontal="$3" paddingVertical="$2">
      <TamaguiText fontSize={18} marginRight="$2">
        🔍
      </TamaguiText>
      <Input
        testID="filter-search-input"
        placeholder={t('images.search_conversations') ?? 'Search conversations...'}
        value={value}
        onChangeText={(e) => onChange(typeof e === 'string' ? e : String(e))}
        borderWidth={0}
        backgroundColor="transparent"
        padding={0}
        fontSize={16}
        flex={1}
        {...({ placeholderTextColor: '#9CA3AF' } as any)}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
        >
          <TamaguiText fontSize={16} color="#9CA3AF">
            ✕
          </TamaguiText>
        </Pressable>
      )}
    </XStack>
  );
}

/**
 * Sticky header with drag handle and search
 */
function StickyHeader({
  searchQuery,
  onSearchChange,
  selectedConversationId,
  onSelectAll,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedConversationId: string | null;
  onSelectAll: () => void;
}) {
  return (
    <View style={styles.stickyHeader}>
      {/* All conversations option */}
      <AllConversationsItem
        selected={selectedConversationId === null}
        onPress={onSelectAll}
      />

      {/* Divider */}
      <View style={styles.divider} />

      {/* Search input */}
      <SearchInput value={searchQuery} onChange={onSearchChange} />
    </View>
  );
}

/**
 * Empty state component with modern design
 */
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  const { t } = useTranslation();

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$3">
      <Stack
        width={80}
        height={80}
        borderRadius={40}
        backgroundColor="#F3F4F6"
        alignItems="center"
        justifyContent="center"
      >
        <TamaguiText fontSize={36}>
          {hasSearch ? '🔍' : '💬'}
        </TamaguiText>
      </Stack>
      <TamaguiText
        fontSize={18}
        fontWeight="600"
        color="#1C1C1E"
        textAlign="center"
      >
        {hasSearch
          ? t('images.no_matching_conversations')
          : t('images.no_conversations')}
      </TamaguiText>
      <TamaguiText
        fontSize={14}
        color="#8E8E93"
        textAlign="center"
      >
        {hasSearch
          ? t('images.filter_no_matching_conversations_hint')
          : t('images.filter_no_conversations_hint')}
      </TamaguiText>
    </YStack>
  );
}

/**
 * ImageFilterSheet component allows users to filter the gallery by conversation.
 * Features a modern, polished design with smooth animations.
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
      <StickyHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedConversationId={selectedConversationId}
        onSelectAll={handleSelectAll}
      />
    ),
    [searchQuery, selectedConversationId, handleSelectAll]
  );

  const ListEmptyComponent = useCallback(
    () => <EmptyState hasSearch={searchQuery.length > 0} />,
    [searchQuery.length]
  );

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
      statusBarTranslucent
    >
      {/* Overlay backdrop */}
      <Pressable style={styles.overlay} onPress={() => onOpenChange(false)}>
        {/* Sheet Container */}
        <Pressable style={styles.sheetContainer}>
          <Pressable style={styles.sheetContent} onStartShouldSetResponder={() => true}>
            {/* Drag Handle */}
            <DragHandle />

            {/* Title Header */}
            <XStack
              paddingHorizontal="$5"
              paddingBottom="$4"
              alignItems="center"
              justifyContent="space-between"
            >
              <TamaguiText fontSize={20} fontWeight="700" color="#1C1C1E">
                {t('images.filter_by_conversation')}
              </TamaguiText>
              <Pressable
                testID="filter-close-button"
                onPress={() => onOpenChange(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={12}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <TamaguiText fontSize={18} color="#8E8E93">
                  ✕
                </TamaguiText>
              </Pressable>
            </XStack>

            {/* Content area */}
            {loading ? (
              <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
                <Spinner size="large" color="#007AFF" />
                <TamaguiText color="#8E8E93" fontSize={14}>
                  {t('images.loading')}
                </TamaguiText>
              </YStack>
            ) : (
              <FlatList
                data={filteredConversations}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ListHeaderComponent={ListHeaderComponent}
                ListEmptyComponent={ListEmptyComponent}
                stickyHeaderIndices={[0]}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              />
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    height: SHEET_HEIGHT,
  },
  sheetContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    backgroundColor: '#E5E7EB',
  },
  stickyHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  itemPressed: {
    backgroundColor: '#F9FAFB',
  },
  itemSelected: {
    backgroundColor: '#F0F9FF',
  },
  itemSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 78,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 20,
  },
});
