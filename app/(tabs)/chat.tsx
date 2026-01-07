/**
 * Chat screen.
 *
 * Displays the list of conversations for the current user.
 * Supports real-time updates for new messages.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Spinner, YStack } from 'tamagui';
import { Container } from '@/components/ui';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useConversations, useConversationListSubscription } from '@/features/chat/hooks';
import { ConversationList } from '@/features/chat/components';

export default function ChatScreen() {
  const { tenantId, membershipId, loading: authLoading } = useRequireAuth();
  const router = useRouter();

  const { conversations, loading, error, refetch } = useConversations(tenantId, membershipId);

  const [refreshing, setRefreshing] = useState(false);

  // Subscribe to real-time updates for conversation list
  useConversationListSubscription(membershipId, tenantId, {
    onNewMessage: useCallback(() => {
      // Refetch conversations when a new message arrives
      void refetch();
    }, [refetch]),
    onError: useCallback((err: Error) => {
      console.error('Conversation list subscription error:', err);
    }, []),
  });

  const handleConversationPress = useCallback(
    (conversationId: string) => {
      router.push(`/chat/${conversationId}`);
    },
    [router]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void refetch().finally(() => {
      setRefreshing(false);
    });
  }, [refetch]);

  // Show loading spinner while auth/tenant is loading
  if (authLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  return (
    <Container testID="chat-screen" flex={1}>
      <ConversationList
        conversations={conversations}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onConversationPress={handleConversationPress}
        onRefresh={handleRefresh}
      />
    </Container>
  );
}
