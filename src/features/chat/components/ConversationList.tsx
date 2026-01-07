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
import koTranslations from '@/i18n/locales/ko/common.json';
import enTranslations from '@/i18n/locales/en/common.json';

/**
 * Get translation by key (defaults to Korean).
 */
function t(key: string, locale: 'ko' | 'en' = 'ko'): string {
  const translations = locale === 'ko' ? koTranslations : enTranslations;
  const keys = key.split('.');
  let value: unknown = translations;
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }
  return (value as string) || key;
}

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
}

/**
 * Empty state component.
 */
function EmptyState() {
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
      <TamaguiText
        fontSize="$lg"
        fontWeight="600"
        color="$color1"
        textAlign="center"
      >
        {t('chat.empty_state')}
      </TamaguiText>
      <TamaguiText
        fontSize="$md"
        color="$color2"
        textAlign="center"
      >
        {t('chat.empty_state_description')}
      </TamaguiText>
    </Stack>
  );
}

/**
 * Loading state component.
 */
function LoadingState() {
  return (
    <Stack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$3"
    >
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
  return (
    <Stack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$3"
    >
      <TamaguiText fontSize={48}>⚠️</TamaguiText>
      <TamaguiText
        fontSize="$lg"
        fontWeight="600"
        color="$danger"
        textAlign="center"
      >
        {t('error')}
      </TamaguiText>
      <TamaguiText
        fontSize="$md"
        color="$color2"
        textAlign="center"
      >
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
}: ConversationListProps) {
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
      // Search in participant names (for direct messages)
      if (conv.participant_names?.some((name) => name.toLowerCase().includes(query))) {
        return true;
      }
      // Search in last message content
      if (conv.last_message?.content?.toLowerCase().includes(query)) {
        return true;
      }
      return false;
    });
  }, [conversations, searchQuery]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    onSearchChange?.(query);
  }, [onSearchChange]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ConversationWithLastMessage>) => (
      <ConversationListItem
        conversation={item}
        onPress={onConversationPress}
      />
    ),
    [onConversationPress]
  );

  const keyExtractor = useCallback(
    (item: ConversationWithLastMessage) => item.id,
    []
  );

  // ListHeaderComponent for the header
  const ListHeader = useCallback(() => (
    showHeader ? (
      <ChatListHeader
        onSearchChange={handleSearchChange}
        onNewChat={onNewChat}
      />
    ) : null
  ), [showHeader, handleSearchChange, onNewChat]);

  // Show loading state on initial load
  if (loading && conversations.length === 0) {
    return (
      <YStack flex={1}>
        {showHeader && <ChatListHeader onSearchChange={handleSearchChange} onNewChat={onNewChat} />}
        <LoadingState />
      </YStack>
    );
  }

  // Show error state
  if (error && conversations.length === 0) {
    return (
      <YStack flex={1}>
        {showHeader && <ChatListHeader onSearchChange={handleSearchChange} onNewChat={onNewChat} />}
        <ErrorState error={error} />
      </YStack>
    );
  }

  // Show empty state
  if (!loading && conversations.length === 0) {
    return (
      <YStack flex={1}>
        {showHeader && <ChatListHeader onSearchChange={handleSearchChange} onNewChat={onNewChat} />}
        <EmptyState />
      </YStack>
    );
  }

  // Show empty state when search has no results
  if (!loading && filteredConversations.length === 0 && searchQuery.trim()) {
    return (
      <YStack flex={1}>
        <ChatListHeader onSearchChange={handleSearchChange} onNewChat={onNewChat} />
        <Stack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$3">
          <TamaguiText fontSize={48}>🔍</TamaguiText>
          <TamaguiText fontSize="$lg" fontWeight="600" color="$color1" textAlign="center">
            {t('chat.no_conversations')}
          </TamaguiText>
          <TamaguiText fontSize="$md" color="$color2" textAlign="center">
            &quot;{searchQuery}&quot; {t('chat.search_messages')}
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
