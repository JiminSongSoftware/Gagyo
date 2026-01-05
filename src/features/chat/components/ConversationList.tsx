/**
 * Conversation list component.
 *
 * Displays the list of conversations with support for:
 * - Loading state
 * - Empty state
 * - Error state
 * - Pull-to-refresh
 */

import { useCallback } from 'react';
import { FlatList, RefreshControl, ListRenderItemInfo } from 'react-native';
import { Stack, Text as TamaguiText, Spinner, useTheme } from 'tamagui';
import { useTranslation } from '@/i18n';
import { ConversationListItem } from './ConversationListItem';
import type { ConversationWithLastMessage } from '@/types/database';

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
  const { t } = useTranslation();

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
  const { t } = useTranslation();

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
}: ConversationListProps) {
  const theme = useTheme();

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

  // Show loading state on initial load
  if (loading && conversations.length === 0) {
    return <LoadingState />;
  }

  // Show error state
  if (error && conversations.length === 0) {
    return <ErrorState error={error} />;
  }

  // Show empty state
  if (!loading && conversations.length === 0) {
    return <EmptyState />;
  }

  return (
    <FlatList
      testID="conversation-list"
      data={conversations}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
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
    />
  );
}
