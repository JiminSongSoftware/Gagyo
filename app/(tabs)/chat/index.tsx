/**
 * Chat screen.
 *
 * Displays the list of conversations for the current user.
 * Supports real-time updates for new messages.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Modal } from 'react-native';
import { Spinner, YStack, Stack, XStack, Text as TamaguiText } from 'tamagui';
import { Container } from '@/components/ui';
import { SafeScreen } from '@/components/SafeScreen';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useConversations, useConversationListSubscription } from '@/features/chat/hooks';
import { ConversationList } from '@/features/chat/components';
import { useTranslation } from '@/i18n';
import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * New chat menu overlay.
 */
function NewChatMenu({
  visible,
  onNewChat,
  onClose,
}: {
  visible: boolean;
  onNewChat: (type: 'regular' | 'team' | 'open') => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1 }}>
        <Stack
          position="absolute"
          bottom={140}
          right={70}
          backgroundColor="white"
          borderRadius={12}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.15}
          shadowRadius={8}
          width={180}
          overflow="hidden"
        >
          <Pressable
            onPress={() => {
              onNewChat('regular');
              onClose();
            }}
          >
            <XStack
              paddingHorizontal={16}
              paddingVertical={12}
              borderBottomWidth={1}
              borderBottomColor="#e5e5e5"
              alignItems="center"
              gap={12}
            >
              <TamaguiText fontSize={18}>💬</TamaguiText>
              <TamaguiText fontSize={15} color="#000">
                {t('chat.regular_chat')}
              </TamaguiText>
            </XStack>
          </Pressable>

          <Pressable
            onPress={() => {
              onNewChat('team');
              onClose();
            }}
          >
            <XStack
              paddingHorizontal={16}
              paddingVertical={12}
              borderBottomWidth={1}
              borderBottomColor="#e5e5e5"
              alignItems="center"
              gap={12}
            >
              <TamaguiText fontSize={18}>👥</TamaguiText>
              <TamaguiText fontSize={15} color="#000">
                {t('chat.team_chat')}
              </TamaguiText>
            </XStack>
          </Pressable>

          <Pressable
            onPress={() => {
              onNewChat('open');
              onClose();
            }}
          >
            <XStack
              paddingHorizontal={16}
              paddingVertical={12}
              alignItems="center"
              gap={12}
            >
              <TamaguiText fontSize={18}>🌐</TamaguiText>
              <TamaguiText fontSize={15} color="#000">
                {t('chat.open_chat')}
              </TamaguiText>
            </XStack>
          </Pressable>
        </Stack>
      </Pressable>
    </Modal>
  );
}

export default function ChatScreen() {
  const { tenantId, membershipId, loading: authLoading } = useRequireAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const { conversations, loading, error, refetch } = useConversations(tenantId, membershipId);

  const [refreshing, setRefreshing] = useState(false);
  const [showNewChatMenu, setShowNewChatMenu] = useState(false);

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
      // Navigate to the chat detail within the tab stack
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

  const handleNewChat = useCallback((type: 'regular' | 'team' | 'open') => {
    // Navigate to chat creation with type
    router.push(`/chat/new?type=${type}`);
  }, [router]);

  // Show loading spinner while auth/tenant is loading
  if (authLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  return (
    <SafeScreen backgroundColor="#F5F5F7">
      <Container testID="chat-screen" flex={1}>
        <ConversationList
          conversations={conversations}
          loading={loading}
          refreshing={refreshing}
          error={error}
          onConversationPress={handleConversationPress}
          onRefresh={handleRefresh}
          onNewChat={handleNewChat}
          hideNewChatButton
        />

        {/* FAB */}
        <Pressable
          style={styles.fab}
          onPress={() => setShowNewChatMenu(true)}
          testID="create-chat-fab"
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </Pressable>

        {/* New chat menu */}
        <NewChatMenu
          visible={showNewChatMenu}
          onNewChat={handleNewChat}
          onClose={() => setShowNewChatMenu(false)}
        />
      </Container>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
