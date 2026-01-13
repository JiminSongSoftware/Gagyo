/**
 * Conversation list component.
 *
 * Displays the list of conversations with support for:
 * - Loading state
 * - Empty state
 * - Error state
 * - Pull-to-refresh
 */

import { useCallback, useState, useMemo } from 'react';
import { FlatList, RefreshControl, ListRenderItemInfo } from 'react-native';
import { Stack, Text as TamaguiText, Spinner, useTheme, YStack } from 'tamagui';
import { ConversationListItem } from './ConversationListItem';
import { ChatListHeader } from './ChatListHeader';
import type { ConversationWithLastMessage } from '@/types/database';
import { useTranslation } from '@/i18n';

export interface ConversationListProps {
  /**
   * List of conversations to display.
   */
  conversations: ConversationWithLastMessage[];

  /**
   * Whether the list is currently loading.
   */
  loading: boolean;

  /**
   * Whether the list is refreshing (pull-to-refresh).
   */
  refreshing?: boolean;

  /**
   * Error to display, if any.
   */
  error: Error | null;

  /**
   * Callback when a conversation is pressed.
   */
  onConversationPress: (conversationId: string) => void;

  /**
   * Callback for pull-to-refresh.
   */
  onRefresh?: () => void;

  /**
   * Callback when search query changes.
   */
  onSearchChange?: (query: string) => void;

  /**
   * Callback when new chat is requested.
   */
  onNewChat?: (type: 'regular' | 'team' | 'open') => void;

  /**
   * Whether to show the header. Default: true.
   */
  showHeader?: boolean;

  /**
   * Whether to hide the new chat button in the header.
   * Use this when showing a FAB instead.
   */
  hideNewChatButton?: boolean;
}

/**
 * Empty state component.
 */
function EmptyState() {
  const { t } = useTranslation();

  return (
    <Stack
      testID="chat-empty-state"
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$3"
    >
      <TamaguiText fontSize={48}>💬</TamaguiText>
      <TamaguiText fontSize="$lg" fontWeight="600" color="$color1" textAlign="center">
        {t('chat.no_conversations')}
      </TamaguiText>
      <TamaguiText fontSize="$md" color="$color2" textAlign="center">
        {t('chat.start_conversation')}
      </TamaguiText>
    </Stack>
  );
}

/**
 * Loading state component.
 */
function LoadingState() {
  const { t } = useTranslation();

  return (
    <Stack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$3">
      <Spinner size="large" color="$primary" />
      <TamaguiText fontSize="$md" color="$color2">
        {t('loading')}
      </TamaguiText>
    </Stack>
  );
}

/**
 * Error state component.
 */
function ErrorState({ error }: { error: Error }) {
  const { t } = useTranslation();

  return (
    <Stack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$3">
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
 * ConversationList component.
 */
export function ConversationList({
  conversations,
  loading,
  refreshing = false,
  error,
  onConversationPress,
  onRefresh,
  onSearchChange,
  onNewChat,
  showHeader = true,
  hideNewChatButton,
}: ConversationListProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      // Search in conversation name
      if (conv.name?.toLowerCase().includes(query)) {
        return true;
      }
      // Search in participant names (for direct messages) - filter out null/undefined first
      if (conv.participant_names?.some((name) => name?.toLowerCase().includes(query) ?? false)) {
        return true;
      }
      // Search in last message content
      if (conv.last_message?.content?.toLowerCase().includes(query)) {
        return true;
      }
      return false;
    });
  }, [conversations, searchQuery]);

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      onSearchChange?.(query);
    },
    [onSearchChange]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ConversationWithLastMessage>) => (
      <ConversationListItem conversation={item} onPress={onConversationPress} />
    ),
    [onConversationPress]
  );

  const keyExtractor = useCallback((item: ConversationWithLastMessage) => item.id, []);

  // ListHeaderComponent for the header
  const ListHeader = useCallback(
    () =>
      showHeader ? (
        <ChatListHeader
          onSearchChange={handleSearchChange}
          onNewChat={onNewChat}
          hideNewChatButton={hideNewChatButton}
        />
      ) : null,
    [showHeader, handleSearchChange, onNewChat, hideNewChatButton]
  );

  // Show loading state on initial load
  if (loading && conversations.length === 0) {
    return (
      <YStack flex={1}>
        {showHeader && <ChatListHeader onSearchChange={handleSearchChange} onNewChat={onNewChat} hideNewChatButton={hideNewChatButton} />}
        <LoadingState />
      </YStack>
    );
  }

  // Show error state
  if (error && conversations.length === 0) {
    return (
      <YStack flex={1}>
        {showHeader && <ChatListHeader onSearchChange={handleSearchChange} onNewChat={onNewChat} hideNewChatButton={hideNewChatButton} />}
        <ErrorState error={error} />
      </YStack>
    );
  }

  // Show empty state
  if (!loading && conversations.length === 0) {
    return (
      <YStack flex={1}>
        {showHeader && <ChatListHeader onSearchChange={handleSearchChange} onNewChat={onNewChat} hideNewChatButton={hideNewChatButton} />}
        <EmptyState />
      </YStack>
    );
  }

  // Show empty state when search has no results
  if (!loading && filteredConversations.length === 0 && searchQuery.trim()) {
    return (
      <YStack flex={1}>
        <ChatListHeader onSearchChange={handleSearchChange} onNewChat={onNewChat} hideNewChatButton={hideNewChatButton} />
        <Stack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$3">
          <TamaguiText fontSize={48}>🔍</TamaguiText>
          <TamaguiText fontSize="$lg" fontWeight="600" color="$color1" textAlign="center">
            {t('chat.no_search_results')}
          </TamaguiText>
          <TamaguiText fontSize="$md" color="$color2" textAlign="center">
            &quot;{searchQuery}&quot;
          </TamaguiText>
        </Stack>
      </YStack>
    );
  }

  return (
    <FlatList
      testID="conversation-list"
      data={filteredConversations}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary?.val}
          />
        ) : undefined
      }
      contentContainerStyle={{
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={showHeader ? [0] : undefined}
    />
  );
}
