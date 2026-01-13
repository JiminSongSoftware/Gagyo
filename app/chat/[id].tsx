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

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
  TextInput,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
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
  useMediaUpload,
} from '@/features/chat/hooks';
import { MessageInput } from '@/features/chat/components';
import { ChatScreen } from '@/features/chat/screens';
import type { ChatScreenHandle } from '@/features/chat/screens';
import type { MessageInputHandle } from '@/features/chat/components';
import { getRoomBackgroundColor } from '@/features/chat/utils/getRoomBackgroundColor';
import { supabase } from '@/lib/supabase';
import type { ConversationType, MessageWithSender } from '@/types/database';
import type { SendMessageOptions } from '@/features/chat/hooks/useSendMessage';
import { useTranslation } from '@/i18n';
import { SafeScreen } from '@/components/SafeScreen';

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
  onUploadPhoto: () => Promise<void>;
  onUploadVideo: () => Promise<void>;
  onUploadFile: () => Promise<void>;
  onOpenCamera: () => Promise<void>;
  conversationType?: 'direct' | 'small_group' | 'ministry' | 'church_wide';
}

/**
 * Get attachment sheet colors based on conversation type to match input bar.
 */
function getAttachmentSheetColors(conversationType?: string): {
  background: string;
  iconTint: string;
} {
  switch (conversationType) {
    case 'small_group':
      return {
        background: 'rgba(230, 240, 220, 0.95)',
        iconTint: '#5a6b4a',
      };
    case 'ministry':
    case 'church_wide':
      return {
        background: 'rgba(235, 237, 245, 0.95)',
        iconTint: '#5a5f6b',
      };
    default:
      return {
        background: 'rgba(235, 235, 240, 0.95)',
        iconTint: '#8e8e93',
      };
  }
}

function AttachmentActionSheet({
  visible,
  onClose,
  onUploadPhoto,
  onUploadVideo,
  onUploadFile,
  onOpenCamera,
  conversationType,
}: AttachmentActionSheetProps) {
  const { t } = useTranslation();
  const colors = getAttachmentSheetColors(conversationType);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop overlay - positioned absolutely, not in Modal */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        {/* Action sheet content - positioned at bottom */}
        <Pressable style={styles.attachmentSheetContainer} onPress={(e) => e.stopPropagation()}>
          <YStack
            backgroundColor={
              /* eslint-disable-line @typescript-eslint/no-explicit-any -- Tamagui expects specific token type */ colors.background as any
            }
            borderRadius={20}
            padding="$2"
            paddingBottom="$4"
          >
            {/* Photo */}
            <Pressable
              style={styles.attachmentOption}
              onPress={() => {
                onClose();
                void onUploadPhoto();
              }}
            >
              <XStack alignItems="center" gap="$3" padding="$3">
                <Ionicons name="image-outline" size={24} color={colors.iconTint} />
                <Text fontSize="$md" color="$color">
                  {t('chat.upload_photo')}
                </Text>
              </XStack>
            </Pressable>

            {/* Video */}
            <Pressable
              style={styles.attachmentOption}
              onPress={() => {
                onClose();
                void onUploadVideo();
              }}
            >
              <XStack alignItems="center" gap="$3" padding="$3">
                <Ionicons name="videocam-outline" size={24} color={colors.iconTint} />
                <Text fontSize="$md" color="$color">
                  {t('chat.upload_video')}
                </Text>
              </XStack>
            </Pressable>

            {/* File */}
            <Pressable
              style={styles.attachmentOption}
              onPress={() => {
                onClose();
                void onUploadFile();
              }}
            >
              <XStack alignItems="center" gap="$3" padding="$3">
                <Ionicons name="document-outline" size={24} color={colors.iconTint} />
                <Text fontSize="$md" color="$color">
                  {t('chat.upload_file')}
                </Text>
              </XStack>
            </Pressable>

            {/* Camera */}
            <Pressable
              style={styles.attachmentOption}
              onPress={() => {
                onClose();
                void onOpenCamera();
              }}
            >
              <XStack alignItems="center" gap="$3" padding="$3">
                <Ionicons name="camera-outline" size={24} color={colors.iconTint} />
                <Text fontSize="$md" color="$color">
                  {t('chat.open_camera')}
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
  const _insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(256)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 256,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TamaguiStack flex={1} alignItems="flex-end">
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            <TamaguiStack
              width={256}
              height="100%"
              backgroundColor="$background"
              borderLeftWidth={StyleSheet.hairlineWidth}
              borderLeftColor="$borderLight"
              shadowColor="#000"
              shadowOffset={{ width: -2, height: 0 }}
              shadowOpacity={0.15}
              shadowRadius={10}
            >
              {/* Menu items */}
              <YStack flex={1} paddingTop={Math.max(_insets.top, 16)}>
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
                      <XStack alignItems="center" gap={16} flex={1}>
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
                        <Text fontSize={14} color="$color3" marginRight={8}>
                          {item.count}
                        </Text>
                      )}
                      {item.isSettings && (
                        <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
                      )}
                    </XStack>
                  </TouchableOpacity>
                ))}
              </YStack>
            </TamaguiStack>
          </Animated.View>
        </TamaguiStack>
      </TouchableOpacity>
    </Modal>
  );
}

interface ChatHeaderProps {
  title: string;
  onBack: () => void;
  onSearch: () => void;
  onSearchClose: () => void;
  onMenu: () => void;
  searchExpanded: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResultCount?: number;
  currentSearchIndex?: number;
  onPreviousResult?: () => void;
  onNextResult?: () => void;
}

function ChatHeader({
  title,
  onBack,
  onSearch,
  onSearchClose,
  onMenu,
  searchExpanded,
  searchQuery,
  onSearchChange,
  searchResultCount,
  currentSearchIndex,
  onPreviousResult,
  onNextResult,
}: ChatHeaderProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (searchExpanded) {
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <TamaguiStack
          backgroundColor="rgba(255, 255, 255, 0.95)"
          borderBottomWidth={StyleSheet.hairlineWidth}
          borderBottomColor="rgba(0, 0, 0, 0.1)"
          paddingVertical="$2"
        >
          {/* Search input row */}
          <XStack alignItems="center" paddingHorizontal="$3" gap="$2" height={44}>
            {/* Back button */}
            <Pressable onPress={onSearchClose} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </Pressable>

            {/* Search input */}
            <XStack
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
                placeholder={t('chat.search_placeholder')}
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
            </XStack>

            {/* Navigation buttons (only show when there are results) */}
            {searchResultCount !== undefined && searchResultCount > 0 && (
              <>
                <Pressable onPress={onPreviousResult} hitSlop={8} disabled={!onPreviousResult}>
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={onPreviousResult ? '#007AFF' : theme.color3?.val}
                  />
                </Pressable>
                <Text fontSize="$sm" color="$color2" minWidth={40} textAlign="center">
                  {currentSearchIndex !== undefined ? currentSearchIndex + 1 : 0} /{' '}
                  {searchResultCount}
                </Text>
                <Pressable onPress={onNextResult} hitSlop={8} disabled={!onNextResult}>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={onNextResult ? '#007AFF' : theme.color3?.val}
                  />
                </Pressable>
              </>
            )}

            {/* Menu button */}
            <Pressable onPress={onMenu} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#000" />
            </Pressable>
          </XStack>
        </TamaguiStack>
      </>
    );
  }

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
              <Ionicons name="search" size={22} color="#000" />
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
  const { t } = useTranslation();
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
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);

  // Ref to access MessageInput methods
  const messageInputRef = useRef<MessageInputHandle | null>(null);

  // Ref to access ChatScreen methods (for search scroll and keyboard handling)
  const chatScreenRef = useRef<ChatScreenHandle | null>(null);

  // Search state
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultIds, setSearchResultIds] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

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

  // Update search results when query or messages change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResultIds([]);
      setCurrentSearchIndex(0);
      setHighlightedMessageId(null);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = displayMessages
      .map((msg, index) => ({ msg, index }))
      .filter(({ msg }) => {
        const content = msg.content;
        if (content && content.toLowerCase().includes(query)) {
          return true;
        }
        const displayName = msg.sender?.user?.display_name;
        if (displayName && displayName.toLowerCase().includes(query)) {
          return true;
        }
        return false;
      })
      .map(({ msg }) => msg.id);

    setSearchResultIds(results);

    // Reset to first result when query changes
    if (results.length > 0 && currentSearchIndex >= results.length) {
      setCurrentSearchIndex(0);
    }
  }, [displayMessages, searchQuery, currentSearchIndex]);

  // Scroll to and highlight the current search result
  useEffect(() => {
    if (searchResultIds.length > 0 && searchResultIds[currentSearchIndex]) {
      const messageId = searchResultIds[currentSearchIndex];
      setHighlightedMessageId(messageId);
      // Scroll to the message with a small delay to ensure layout is ready
      setTimeout(() => {
        chatScreenRef.current?.scrollToMessage?.(messageId);
      }, 100);
    } else {
      setHighlightedMessageId(null);
    }
  }, [searchResultIds, currentSearchIndex]);

  // Send message mutation
  const {
    sendMessage,
    sendMessageWithOptions,
    sending: sendingMessage,
    error: sendError,
  } = useSendMessage(conversationId, tenantId, membershipId);

  // Media upload hook
  const {
    pickAndUploadPhoto,
    pickAndUploadVideo,
    pickAndUploadFile,
    openCamera,
    uploading: _uploadingMedia,
    error: mediaError,
    clearError: _clearMediaError,
  } = useMediaUpload(conversationId ?? null, tenantId ?? null, membershipId ?? null);

  // Debug logging for media upload parameters
  console.log('Media upload params:', {
    conversationId,
    tenantId,
    membershipId,
  });

  // Show error alert when media upload fails
  useEffect(() => {
    if (mediaError) {
      console.error('Media upload error:', mediaError);
      // TODO: Show error toast/alert to user
    }
  }, [mediaError]);

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
    async (
      content: string,
      quoteAttachment?: {
        messageId: string;
        senderName: string;
        senderAvatar?: string | null;
        content: string;
      } | null
    ) => {
      if (quoteAttachment) {
        await sendMessageWithOptions({
          content,
          quoteAttachment,
        });
      } else {
        await sendMessage(content);
      }
    },
    [sendMessage, sendMessageWithOptions]
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

  const handleSearch = useCallback(() => {
    setSearchExpanded(true);
    setSearchQuery('');
    setSearchResultIds([]);
    setCurrentSearchIndex(0);
  }, []);

  const handleSearchClose = useCallback(() => {
    setSearchExpanded(false);
    setSearchQuery('');
    setSearchResultIds([]);
    setCurrentSearchIndex(0);
    setHighlightedMessageId(null);
  }, []);

  const handlePreviousResult = useCallback(() => {
    setCurrentSearchIndex((prev) => {
      if (searchResultIds.length === 0) return prev;
      return prev > 0 ? prev - 1 : searchResultIds.length - 1;
    });
  }, [searchResultIds.length]);

  const handleNextResult = useCallback(() => {
    setCurrentSearchIndex((prev) => {
      if (searchResultIds.length === 0) return prev;
      return prev < searchResultIds.length - 1 ? prev + 1 : 0;
    });
  }, [searchResultIds.length]);

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
  }, [conversationName, conversationType, t]);

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

      <SafeScreen>
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
            onSearchClose={handleSearchClose}
            onMenu={() => setShowMenu(true)}
            searchExpanded={searchExpanded}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResultCount={searchResultIds.length}
            currentSearchIndex={currentSearchIndex}
            onPreviousResult={searchResultIds.length > 0 ? handlePreviousResult : undefined}
            onNextResult={searchResultIds.length > 0 ? handleNextResult : undefined}
          />

          {/* Content */}
          <TamaguiStack flex={1} overflow="hidden">
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
            >
              {/* Message list with action menu */}
              <ChatScreen
                ref={chatScreenRef}
                messages={displayMessages}
                highlightedMessageId={highlightedMessageId}
                loading={loading}
                loadingMore={!loading && sendingMessage}
                hasMore={hasMore}
                error={error}
                conversationType={conversationType}
                currentUserId={membershipId || ''}
                onLoadMore={() => void loadMore()}
                showThreadIndicators={true}
                testID="chat-screen"
              />

              {/* Message input */}
              <MessageInput
                ref={messageInputRef}
                onSend={handleSend}
                onSendEventChat={handleSendEventChat}
                sending={sendingMessage}
                error={sendError}
                conversationId={conversationId ?? undefined}
                tenantId={tenantId ?? undefined}
                currentMembershipId={membershipId ?? undefined}
                onPlusPress={() => setShowAttachmentSheet(true)}
                conversationType={conversationType}
              />
            </KeyboardAvoidingView>
          </TamaguiStack>
        </TamaguiStack>
      </SafeScreen>

      {/* Menu Bottom Sheet */}
      <ChatMenuSheet visible={showMenu} onClose={() => setShowMenu(false)} menuItems={menuItems} />

      {/* Attachment Action Sheet */}
      <AttachmentActionSheet
        visible={showAttachmentSheet}
        onClose={() => setShowAttachmentSheet(false)}
        onUploadPhoto={async () => {
          setShowAttachmentSheet(false);
          await pickAndUploadPhoto();
          // Real-time subscription will automatically add the message
        }}
        onUploadVideo={async () => {
          setShowAttachmentSheet(false);
          await pickAndUploadVideo();
          // Real-time subscription will automatically add the message
        }}
        onUploadFile={async () => {
          setShowAttachmentSheet(false);
          await pickAndUploadFile();
          // Real-time subscription will automatically add the message
        }}
        onOpenCamera={async () => {
          setShowAttachmentSheet(false);
          await openCamera();
          // Real-time subscription will automatically add the message
        }}
        conversationType={conversationType}
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
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    marginBottom: Platform.OS === 'ios' ? 70 : 0,
  },
  attachmentOption: {
    width: '100%',
  },
});
