/**
 * Chat list header component.
 *
 * KakaoTalk-style header with:
 * - "대화방/Chats" title on the left
 * - Expandable search field on the right
 * - New chat button with options (regular chat, team chat, open chat)
 */

import { useState } from 'react';
import { Pressable, TextInput as RNTextInput, LayoutChangeEvent } from 'react-native';
import { Stack, Text as TamaguiText, XStack, useTheme } from 'tamagui';
import { Svg, Circle, Path } from 'react-native-svg';
import { useTranslation } from '@/i18n';

export interface ChatListHeaderProps {
  /**
   * Callback when search query changes.
   */
  onSearchChange?: (query: string) => void;

  /**
   * Callback when new chat is requested.
   */
  onNewChat?: (type: 'regular' | 'team' | 'open') => void;
}

// Force recompile
/**
 * Search icon component.
 */
function SearchIcon({ size = 20, color = '#40434D' }: { size?: number; color?: string }) {
  return (
    <Stack width={size} height={size} alignItems="center" justifyContent="center">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
          cx="11"
          cy="11"
          r="6"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M21 21L15.5 15.5"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Stack>
  );
}

/**
 * Plus icon for new chat button.
 */
function PlusIcon({ size = 24, color = '#40434D' }: { size?: number; color?: string }) {
  return (
    <Stack width={size} height={size} alignItems="center" justifyContent="center">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 5V19M5 12H19"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Stack>
  );
}

/**
 * X icon for closing search.
 */
function XIcon({ size = 20, color = '#40434D' }: { size?: number; color?: string }) {
  return (
    <Stack width={size} height={size} alignItems="center" justifyContent="center">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M18 6L6 18M6 6L18 18"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Stack>
  );
}

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

  if (!visible) return null;

  return (
    <Pressable
      onPress={onClose}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}
    >
      <Stack flex={1} backgroundColor="rgba(0,0,0,0.3)">
        <Stack
          position="absolute"
          top={60}
          right={16}
          backgroundColor="white"
          borderRadius={12}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.15}
          shadowRadius={8}
          elevation={5}
          width={180}
        >
          <Pressable onPress={() => { onNewChat('regular'); onClose(); }}>
            <Stack
              paddingHorizontal="$4"
              paddingVertical="$3"
              borderBottomWidth={1}
              borderBottomColor="$borderLight"
              alignItems="center"
              flexDirection="row"
              gap="$3"
            >
              <TamaguiText fontSize="$lg">💬</TamaguiText>
              <TamaguiText fontSize="$md" color="$color1">
                {t('chat.regular_chat')}
              </TamaguiText>
            </Stack>
          </Pressable>

          <Pressable onPress={() => { onNewChat('team'); onClose(); }}>
            <Stack
              paddingHorizontal="$4"
              paddingVertical="$3"
              borderBottomWidth={1}
              borderBottomColor="$borderLight"
              alignItems="center"
              flexDirection="row"
              gap="$3"
            >
              <TamaguiText fontSize="$lg">👥</TamaguiText>
              <TamaguiText fontSize="$md" color="$color1">
                {t('chat.team_chat')}
              </TamaguiText>
            </Stack>
          </Pressable>

          <Pressable onPress={() => { onNewChat('open'); onClose(); }}>
            <Stack
              paddingHorizontal="$4"
              paddingVertical="$3"
              alignItems="center"
              flexDirection="row"
              gap="$3"
            >
              <TamaguiText fontSize="$lg">🌐</TamaguiText>
              <TamaguiText fontSize="$md" color="$color1">
                {t('chat.open_chat')}
              </TamaguiText>
            </Stack>
          </Pressable>
        </Stack>
      </Stack>
    </Pressable>
  );
}

/**
 * ChatListHeader component.
 */
export function ChatListHeader({ onSearchChange, onNewChat }: ChatListHeaderProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatMenu, setShowNewChatMenu] = useState(false);
  const [headerWidth, setHeaderWidth] = useState(0);

  const handleSearchToggle = () => {
    if (searchExpanded) {
      setSearchExpanded(false);
      setSearchQuery('');
      onSearchChange?.('');
    } else {
      setSearchExpanded(true);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    onSearchChange?.(text);
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    setHeaderWidth(e.nativeEvent.layout.width);
  };

  return (
    <>
      <Stack onLayout={handleLayout} backgroundColor="#F5F5F5" borderBottomWidth={1} borderBottomColor="#E0E0E0">
        <XStack
            alignItems="center"
            paddingHorizontal="$4"
            paddingVertical="$3"
            height={56}
            justifyContent="space-between"
          >
            {/* Title on the left */}
            <TamaguiText
              fontSize="$xl"
              fontWeight="700"
              color="$color1"
              flex={searchExpanded ? 0 : 1}
            >
              {t('chat.chats')}
            </TamaguiText>

            {/* Right side: Search and New Chat buttons */}
            <XStack alignItems="center" gap="$3">
              {/* Search field / icon */}
              {searchExpanded ? (
                <XStack
                  alignItems="center"
                  backgroundColor="white"
                  borderRadius={20}
                  paddingHorizontal="$3"
                  height={36}
                  borderWidth={1}
                  borderColor="$borderLight"
                  style={{ width: Math.min(headerWidth - 120, 200) }}
                >
                  <SearchIcon size={16} color={theme.color3?.val || '#999'} />
                  <Stack flex={1}>
                    <RNTextInput
                      value={searchQuery}
                      onChangeText={handleSearchChange}
                      placeholder={t('chat.search_conversations')}
                      placeholderTextColor={theme.color3?.val || '#999'}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: theme.color1?.val || '#000',
                        paddingHorizontal: 6,
                        paddingVertical: 0,
                        height: 36,
                      }}
                      autoFocus
                      selectTextOnFocus
                    />
                  </Stack>
                  <Pressable onPress={handleSearchToggle} hitSlop={4}>
                    <XIcon size={16} color={theme.color3?.val || '#999'} />
                  </Pressable>
                </XStack>
              ) : (
                <Pressable onPress={handleSearchToggle} hitSlop={8}>
                  <Stack
                    width={36}
                    height={36}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={18}
                    backgroundColor="$backgroundTertiary"
                  >
                    <SearchIcon size={18} />
                  </Stack>
                </Pressable>
              )}

              {/* New chat button */}
              <Pressable
                onPress={() => setShowNewChatMenu(true)}
                hitSlop={8}
                disabled={searchExpanded}
                style={{ opacity: searchExpanded ? 0.3 : 1 }}
              >
                <Stack
                  width={36}
                  height={36}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={18}
                  backgroundColor="$primary"
                >
                  <PlusIcon size={20} color="white" />
                </Stack>
              </Pressable>
            </XStack>
          </XStack>
      </Stack>

      {/* New chat menu overlay */}
      <NewChatMenu
        visible={showNewChatMenu}
        onNewChat={(type) => onNewChat?.(type)}
        onClose={() => setShowNewChatMenu(false)}
      />
    </>
  );
}
