/**
 * Chat detail screen.
 *
 * Displays a single conversation with messages and input.
 * Features:
 * - Paginated message list
 * - Real-time message updates
 * - Send text messages
 * - Room type background colors
 * - Custom header with back arrow, name, search, and menu icons
 * - Bottom sheet for photos/videos/files/participants/settings
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
  TextInput,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Stack as TamaguiStack, useTheme, XStack, YStack, Text } from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useCurrentMembership } from '@/hooks/useCurrentMembership';
import {
  useMessages,
  useSendMessage,
  useMessageSubscription,
  appendMessage,
  updateMessage,
  removeMessage,
} from '@/features/chat/hooks';
import { MessageList, MessageInput } from '@/features/chat/components';
import { getRoomBackgroundColor } from '@/features/chat/utils/getRoomBackgroundColor';
import { supabase } from '@/lib/supabase';
import type { ConversationType, MessageWithSender } from '@/types/database';
import type { SendMessageOptions } from '@/features/chat/hooks/useSendMessage';
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

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count?: number;
  onPress: () => void;
  isSettings?: boolean;
}

interface AttachmentActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onUploadImage: () => void;
}

function _AttachmentActionSheet({ visible, onClose, onUploadImage }: AttachmentActionSheetProps) {
  if (!visible) return null;

  return (
    <>
      {/* Backdrop overlay - positioned absolutely, not in Modal */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        {/* Action sheet content - positioned at bottom */}
        <Pressable style={styles.attachmentSheetContainer} onPress={(e) => e.stopPropagation()}>
          <YStack backgroundColor="$background" borderRadius="$4" padding="$2" paddingBottom="$4">
            <Pressable
              style={styles.attachmentOption}
              onPress={() => {
                onClose();
                onUploadImage();
              }}
            >
              <XStack alignItems="center" gap="$3" padding="$3">
                <Ionicons name="image-outline" size={24} color="#8e8e93" />
                <Text fontSize="$md" color="$color">
                  {t('chat.upload_image')}
                </Text>
              </XStack>
            </Pressable>

            <YStack height={1} backgroundColor="$borderLight" marginHorizontal="$2" />

            <Pressable style={styles.attachmentOption} onPress={onClose}>
              <XStack alignItems="center" justifyContent="center" padding="$3">
                <Text fontSize="$md" color="$primary" fontWeight="bold">
                  {t('chat.cancel')}
                </Text>
              </XStack>
            </Pressable>
          </YStack>
        </Pressable>
      </Pressable>
    </>
  );
}

interface ChatMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
}

function ChatMenuSheet({ visible, onClose, menuItems }: ChatMenuSheetProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TamaguiStack flex={1} justifyContent="flex-end">
          <TouchableOpacity activeOpacity={1}>
            <TamaguiStack
              backgroundColor="$background"
              borderTopLeftRadius={20}
              borderTopRightRadius={20}
              paddingBottom={Platform.OS === 'ios' ? 40 : 20}
              shadowColor="#000"
              shadowOffset={{ width: 0, height: -2 }}
              shadowOpacity={0.1}
              shadowRadius={10}
              elevation={10}
            >
              {/* Handle bar */}
              <TamaguiStack
                width={40}
                height={4}
                backgroundColor="$gray8Light"
                borderRadius={2}
                alignSelf="center"
                marginTop={12}
                marginBottom={8}
              />

              {/* Menu items */}
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                  activeOpacity={0.7}
                >
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    paddingHorizontal={20}
                    paddingVertical={16}
                    borderBottomWidth={index < menuItems.length - 1 ? 1 : 0}
                    borderBottomColor="$borderLight"
                  >
                    <XStack alignItems="center" gap={16}>
                      <Ionicons
                        name={item.icon}
                        size={24}
                        color={item.isSettings ? '#8e8e93' : theme.color1?.val}
                      />
                      <Text fontSize={16} color={item.isSettings ? '#8e8e93' : '$color'}>
                        {item.label}
                      </Text>
                    </XStack>
                    {item.count !== undefined && (
                      <Text fontSize={14} color="$gray11Light">
                        {item.count}
                      </Text>
                    )}
                    {item.isSettings && (
                      <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
                    )}
                  </XStack>
                </TouchableOpacity>
              ))}
            </TamaguiStack>
          </TouchableOpacity>
        </TamaguiStack>
      </TouchableOpacity>
    </Modal>
  );
}

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  messages: MessageWithSender[];
  currentUserId: string;
}

function SearchModal({
  visible,
  onClose,
  searchQuery,
  onSearchChange,
  messages,
  currentUserId,
}: SearchModalProps) {
  const theme = useTheme();

  const renderMessage = useCallback(
    ({ item }: { item: MessageWithSender }) => {
      // Import the MessageBubble component
      // For now, we'll use a simple render since MessageBubble is in another file
      const isCurrentUser = item.sender_id === currentUserId;
      const backgroundColor = isCurrentUser ? '$primaryLight' : '$background';
      const textColor = isCurrentUser ? '$color' : '$color';
      const align = isCurrentUser ? 'flex-end' : 'flex-start';

      return (
        <XStack key={item.id} width="100%" justifyContent={align} marginBottom="$2">
          <TamaguiStack
            maxWidth="75%"
            backgroundColor={backgroundColor}
            padding="$3"
            borderRadius="$2"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 1 }}
            shadowOpacity={0.1}
            shadowRadius={2}
          >
            <Text fontSize={14} color={textColor}>
              {item.content}
            </Text>
            <Text fontSize="$xs" color="$color3" marginTop="$1">
              {item.sender?.user?.display_name ?? t('chat.unknown')}
            </Text>
          </TamaguiStack>
        </XStack>
      );
    },
    [currentUserId]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TamaguiStack flex={1} justifyContent="flex-end">
          <TouchableOpacity activeOpacity={1}>
            <TamaguiStack
              backgroundColor="$background"
              borderTopLeftRadius={20}
              borderTopRightRadius={20}
              paddingBottom={Platform.OS === 'ios' ? 40 : 20}
              height="80%"
            >
              {/* Search header */}
              <XStack
                alignItems="center"
                justifyContent="space-between"
                paddingHorizontal="$4"
                paddingVertical="$3"
                borderBottomWidth={1}
                borderBottomColor="$borderLight"
              >
                <Text fontSize="$lg" fontWeight="600">
                  {t('chat.search_messages')}
                </Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={24} color={theme.color1?.val} />
                </Pressable>
              </XStack>

              {/* Search input */}
              <XStack paddingHorizontal="$4" paddingVertical="$3" gap="$2" alignItems="center">
                <TamaguiStack
                  flex={1}
                  backgroundColor="$backgroundTertiary"
                  borderRadius="$2"
                  paddingHorizontal="$3"
                  height={36}
                  alignItems="center"
                >
                  <Ionicons name="search" size={18} color={theme.color3?.val} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    placeholder={t('chat.search_conversations')}
                    placeholderTextColor={theme.color3?.val}
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      fontSize: 16,
                      color: theme.color1?.val,
                      padding: 0,
                      height: 36,
                    }}
                    autoFocus
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => onSearchChange('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={theme.color3?.val} />
                    </Pressable>
                  )}
                </TamaguiStack>
              </XStack>

              {/* Search results */}
              <TamaguiStack flex={1} paddingHorizontal="$4">
                {messages.length === 0 ? (
                  <TamaguiStack flex={1} alignItems="center" justifyContent="center" gap="$2">
                    <Ionicons name="search-outline" size={48} color={theme.color3?.val} />
                    <Text fontSize="$md" color="$color3">
                      {searchQuery ? t('chat.no_conversations') : t('chat.search_placeholder')}
                    </Text>
                  </TamaguiStack>
                ) : (
                  <FlatList
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingVertical: 16 }}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </TamaguiStack>
            </TamaguiStack>
          </TouchableOpacity>
        </TamaguiStack>
      </TouchableOpacity>
    </Modal>
  );
}

interface ChatHeaderProps {
  title: string;
  onBack: () => void;
  onSearch: () => void;
  onMenu: () => void;
}

function ChatHeader({ title, onBack, onSearch, onMenu }: ChatHeaderProps) {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <TamaguiStack
        backgroundColor="rgba(255, 255, 255, 0.95)"
        borderBottomWidth={StyleSheet.hairlineWidth}
        borderBottomColor="rgba(0, 0, 0, 0.1)"
      >
        <XStack alignItems="center" height={44} width="100%">
          {/* Left: Back button - fixed position from left edge */}
          <XStack
            width={44}
            height={44}
            alignItems="center"
            justifyContent="center"
            position="absolute"
            left={0}
          >
            <Pressable onPress={onBack} hitSlop={8} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </Pressable>
          </XStack>

          {/* Center: Title */}
          <Text
            position="absolute"
            left={44}
            right={88}
            fontSize={17}
            fontWeight="600"
            color="#000"
            numberOfLines={1}
            textAlign="center"
          >
            {title}
          </Text>

          {/* Right: Search and Menu - fixed position from right edge */}
          <XStack
            width={88}
            height={44}
            alignItems="center"
            justifyContent="flex-end"
            gap={8}
            position="absolute"
            right={0}
            paddingRight={8}
          >
            <Pressable onPress={onSearch} hitSlop={8}>
              <Ionicons name="search-outline" size={22} color="#000" />
            </Pressable>
            <Pressable onPress={onMenu} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#000" />
            </Pressable>
          </XStack>
        </XStack>
      </TamaguiStack>
    </>
  );
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { tenantId } = useRequireAuth();
  const { membershipId } = useCurrentMembership();

  const conversationId = params.id;

  // Fetch conversation details (type, name) for header
  const [conversationType, setConversationType] = useState<ConversationType>('direct');
  const [conversationName, setConversationName] = useState<string | null>(null);

  // Menu sheet state
  const [showMenu, setShowMenu] = useState(false);
  const [mediaCounts, setMediaCounts] = useState({ photos: 0, videos: 0, files: 0 });
  const [participantCount, setParticipantCount] = useState(0);

  // Attachment action sheet state
  const [_showAttachmentSheet, _setShowAttachmentSheet] = useState(false);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch messages for this conversation
  const { messages, loading, error, loadMore, hasMore } = useMessages(conversationId, tenantId);

  // Local state for real-time message updates
  const [realTimeMessages, setRealTimeMessages] = useState<MessageWithSender[]>([]);

  // Update local state when initial messages load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setRealTimeMessages(messages);
    }
  }, [messages, loading]);

  // Use real-time messages for display
  const displayMessages = useMemo(() => {
    return realTimeMessages.length > 0 ? realTimeMessages : messages;
  }, [realTimeMessages, messages]);

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) {
      return displayMessages;
    }
    const query = searchQuery.toLowerCase();
    return displayMessages.filter((msg) => {
      if (msg.content?.toLowerCase().includes(query)) {
        return true;
      }
      if (msg.sender?.user?.display_name?.toLowerCase().includes(query)) {
        return true;
      }
      return false;
    });
  }, [displayMessages, searchQuery]);

  // Send message mutation
  const {
    sendMessage,
    sendMessageWithOptions,
    sending: sendingMessage,
    error: sendError,
  } = useSendMessage(conversationId, tenantId, membershipId);

  // Fetch conversation details and media counts
  useEffect(() => {
    if (!conversationId || !tenantId) return;

    const fetchConversationDetails = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('type, name')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .single();

      if (data) {
        setConversationType(data.type);
        setConversationName(data.name);
      }
    };

    void fetchConversationDetails();
  }, [conversationId, tenantId]);

  // Fetch participant count
  useEffect(() => {
    if (!conversationId) return;

    const fetchParticipantCount = async () => {
      const { count } = await supabase
        .from('conversation_participants')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);

      setParticipantCount(count ?? 0);
    };

    void fetchParticipantCount();
  }, [conversationId]);

  // Calculate media counts from messages
  useEffect(() => {
    if (!displayMessages.length) return;

    const photos = displayMessages.filter((m) => m.content_type === 'image').length;
    const videos = displayMessages.filter((m) => m.content_type === 'video').length;
    const files = displayMessages.filter((m) => m.content_type === 'file').length;

    setMediaCounts({ photos, videos, files });
  }, [displayMessages]);

  // Helper to increment reply count on parent message
  const incrementParentReplyCount = useCallback((parentId: string) => {
    setRealTimeMessages((prev) =>
      prev.map((msg) =>
        msg.id === parentId ? { ...msg, reply_count: (msg.reply_count || 0) + 1 } : msg
      )
    );
  }, []);

  // Helper to decrement reply count on parent message
  const decrementParentReplyCount = useCallback((parentId: string) => {
    setRealTimeMessages((prev) =>
      prev.map((msg) =>
        msg.id === parentId ? { ...msg, reply_count: Math.max(0, (msg.reply_count || 0) - 1) } : msg
      )
    );
  }, []);

  // Subscribe to real-time message updates
  useMessageSubscription(conversationId, tenantId, {
    onInsert: useCallback(
      (message: MessageWithSender) => {
        // If this is a thread reply, increment the parent's reply count
        if (message.parent_id) {
          incrementParentReplyCount(message.parent_id);
          // Don't add thread replies to the main message list
          return;
        }
        // Add top-level message to the list
        setRealTimeMessages((prev) => appendMessage(prev, message));
      },
      [incrementParentReplyCount]
    ),
    onUpdate: useCallback((message: MessageWithSender) => {
      setRealTimeMessages((prev) => updateMessage(prev, message));
    }, []),
    onDelete: useCallback(
      (messageId: string, oldMessage?: Partial<MessageWithSender>) => {
        // If deleted message had a parent_id (thread reply), decrement parent's reply count
        // Note: oldMessage may not be available in all cases
        if (oldMessage?.parent_id) {
          decrementParentReplyCount(oldMessage.parent_id);
          return;
        }
        // Remove top-level message from the list
        setRealTimeMessages((prev) => removeMessage(prev, messageId));
      },
      [decrementParentReplyCount]
    ),
    onError: useCallback((err: Error) => {
      console.error('Message subscription error:', err);
    }, []),
  });

  // Update last_read_at when viewing conversation
  useEffect(() => {
    if (!conversationId || !membershipId) return;

    const updateLastRead = async () => {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('membership_id', membershipId);
    };

    // Update on mount and when messages change
    void updateLastRead();
  }, [conversationId, membershipId, displayMessages.length]);

  const handleSend = useCallback(
    async (content: string) => {
      await sendMessage(content);
    },
    [sendMessage]
  );

  const handleSendEventChat = useCallback(
    async (options: SendMessageOptions) => {
      await sendMessageWithOptions(options);
    },
    [sendMessageWithOptions]
  );

  const handleBack = useCallback(() => {
    router.push('/chat');
  }, [router]);

  const handleMessagePress = useCallback(
    (message: MessageWithSender) => {
      // Navigate to thread view if message has replies or is a top-level message
      // Only top-level messages can have threads (parent_id is null)
      if (!message.parent_id) {
        router.push(`/chat/thread/${message.id}`);
      }
    },
    [router]
  );

  const handleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (!prev) {
        // Opening search - clear previous query
        setSearchQuery('');
      }
      return !prev;
    });
  }, []);

  const getHeaderTitle = useCallback(() => {
    if (conversationName) {
      return conversationName;
    }
    switch (conversationType) {
      case 'small_group':
        return t('chat.small_group');
      case 'ministry':
        return t('chat.ministry');
      case 'church_wide':
        return t('chat.church_wide');
      default:
        return t('chat.chat');
    }
  }, [conversationName, conversationType]);

  // Menu items for the bottom sheet
  const menuItems: MenuItem[] = [
    {
      icon: 'image-outline',
      label: t('chat.menu.photos'),
      count: mediaCounts.photos,
      onPress: () => {
        console.log('Navigate to photos');
        // TODO: Navigate to photos view
      },
    },
    {
      icon: 'videocam-outline',
      label: t('chat.menu.videos'),
      count: mediaCounts.videos,
      onPress: () => {
        console.log('Navigate to videos');
        // TODO: Navigate to videos view
      },
    },
    {
      icon: 'document-outline',
      label: t('chat.menu.files'),
      count: mediaCounts.files,
      onPress: () => {
        console.log('Navigate to files');
        // TODO: Navigate to files view
      },
    },
    {
      icon: 'people-outline',
      label: t('chat.menu.participants'),
      count: participantCount,
      onPress: () => {
        console.log('Navigate to participants');
        // TODO: Navigate to participants view
      },
    },
    {
      icon: 'settings-outline',
      label: t('chat.menu.chat_settings'),
      isSettings: true,
      onPress: () => {
        console.log('Navigate to chat settings');
        // TODO: Navigate to chat settings (wallpaper, etc.)
      },
    },
  ];

  return (
    <>
      {/* Hide default header */}
      <Stack.Screen options={{ headerShown: false }} />

      <TamaguiStack
        testID="chat-detail-screen"
        flex={1}
        backgroundColor={getRoomBackgroundColor(conversationType)}
      >
        {/* Custom Header */}
        <ChatHeader
          title={getHeaderTitle()}
          onBack={handleBack}
          onSearch={handleSearch}
          onMenu={() => setShowMenu(true)}
        />

        {/* Content */}
        <TamaguiStack flex={1} overflow="hidden">
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
          >
            {/* Message list */}
            <MessageList
              messages={displayMessages}
              loading={loading}
              loadingMore={!loading && sendingMessage}
              hasMore={hasMore}
              error={error}
              conversationType={conversationType}
              currentUserId={membershipId || ''}
              onLoadMore={() => void loadMore()}
              onMessagePress={handleMessagePress}
            />

            {/* Message input */}
            <MessageInput
              onSend={handleSend}
              onSendEventChat={handleSendEventChat}
              sending={sendingMessage}
              error={sendError}
              conversationId={conversationId}
              tenantId={tenantId}
              currentMembershipId={membershipId}
            />
          </KeyboardAvoidingView>
        </TamaguiStack>
      </TamaguiStack>

      {/* Menu Bottom Sheet */}
      <ChatMenuSheet visible={showMenu} onClose={() => setShowMenu(false)} menuItems={menuItems} />

      {/* Search Modal */}
      <SearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        messages={filteredMessages}
        currentUserId={membershipId || ''}
      />
    </>
  );
}

const styles = StyleSheet.create({
  attachmentSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  attachmentOption: {
    width: '100%',
  },
});
