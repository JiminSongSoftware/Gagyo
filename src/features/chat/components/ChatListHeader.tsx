/**
 * Chat list header component.
 *
 * Centered header with "Chat" title:
 * - "Chat/대화" title centered
 * - Search icon on the left (or right when search expands)
 * - New chat button on the right
 * - Symmetric icon layout
 */

import { useTranslation } from '@/i18n';
import { useState, useEffect } from 'react';
import { LayoutChangeEvent, Modal, Pressable, TextInput as RNTextInput, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Circle, Path, Svg } from 'react-native-svg';
import { Stack, Text as TamaguiText, XStack, useTheme } from 'tamagui';

export interface ChatListHeaderProps {
  /**
   * Callback when search query changes.
   */
  onSearchChange?: (query: string) => void;

  /**
   * Callback when new chat is requested.
   */
  onNewChat?: (type: 'regular' | 'team' | 'open') => void;

  /**
   * Whether to hide the new chat button in the header.
   * Use this when showing a FAB instead.
   */
  hideNewChatButton?: boolean;
}

/**
 * Search icon component.
 */
function SearchIcon({ size = 20, color = '#40434D' }: { size?: number; color?: string }) {
  return (
    <Stack
      width={size}
      height={size}
      alignItems="center"
      justifyContent="center"
      pointerEvents="none"
    >
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
    <Stack
      width={size}
      height={size}
      alignItems="center"
      justifyContent="center"
      pointerEvents="none"
    >
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
    <Stack
      width={size}
      height={size}
      alignItems="center"
      justifyContent="center"
      pointerEvents="none"
    >
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
 * New chat menu overlay with Liquid Glass effect.
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
  const [liquidGlassAvailable, setLiquidGlassAvailable] = useState(false);

  useEffect(() => {
    setLiquidGlassAvailable(isLiquidGlassAvailable());
  }, []);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1 }}>
        {/* Menu - positioned absolutely below the header */}
        <Stack
          position="absolute"
          top={95}
          right={12}
          backgroundColor="white"
          borderRadius={12}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.15}
          shadowRadius={8}
          width={180}
          overflow="hidden"
        >
          {/* Liquid Glass overlay on iOS 26+ */}
          {Platform.OS === 'ios' && liquidGlassAvailable && (
            <GlassView
              style={StyleSheet.absoluteFill}
              glassEffectStyle="regular"
              tintColor="#FFFFFF80"
              isInteractive={false}
            />
          )}

          <Pressable
            onPress={() => {
              onNewChat('regular');
              onClose();
            }}
          >
            <Stack
              paddingHorizontal="$4"
              paddingVertical="$3"
              borderBottomWidth={1}
              borderBottomColor="$borderLight"
              alignItems="center"
              flexDirection="row"
              gap="$3"
              zIndex={1}
            >
              <TamaguiText fontSize="$lg">💬</TamaguiText>
              <TamaguiText fontSize="$md" color="$color1">
                {t('chat.regular_chat')}
              </TamaguiText>
            </Stack>
          </Pressable>

          <Pressable
            onPress={() => {
              onNewChat('team');
              onClose();
            }}
          >
            <Stack
              paddingHorizontal="$4"
              paddingVertical="$3"
              borderBottomWidth={1}
              borderBottomColor="$borderLight"
              alignItems="center"
              flexDirection="row"
              gap="$3"
              zIndex={1}
            >
              <TamaguiText fontSize="$lg">👥</TamaguiText>
              <TamaguiText fontSize="$md" color="$color1">
                {t('chat.team_chat')}
              </TamaguiText>
            </Stack>
          </Pressable>

          <Pressable
            onPress={() => {
              onNewChat('open');
              onClose();
            }}
          >
            <Stack
              paddingHorizontal="$4"
              paddingVertical="$3"
              alignItems="center"
              flexDirection="row"
              gap="$3"
              zIndex={1}
            >
              <TamaguiText fontSize="$lg">🌐</TamaguiText>
              <TamaguiText fontSize="$md" color="$color1">
                {t('chat.open_chat')}
              </TamaguiText>
            </Stack>
          </Pressable>
        </Stack>
      </Pressable>
    </Modal>
  );
}

/**
 * ChatListHeader component with centered title and symmetric icon layout.
 */
export function ChatListHeader({ onSearchChange, onNewChat, hideNewChatButton }: ChatListHeaderProps) {
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
      <Stack
        onLayout={handleLayout}
        backgroundColor="#F5F5F7"
        borderBottomWidth={1}
        borderBottomColor="#E0E0E0"
      >
        <XStack
          alignItems="center"
          paddingHorizontal="$4"
          paddingVertical="$3"
          height={56}
          justifyContent="space-between"
        >
          {/* Left side: Search button */}
          <XStack alignItems="center" width={36}>
            {!searchExpanded && (
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
          </XStack>

          {/* Centered title */}
          <XStack flex={1} alignItems="center" justifyContent="center">
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
              <TamaguiText
                fontSize={20}
                fontWeight="700"
                color="$color1"
                textAlign="center"
              >
                {t('chat.chat')}
              </TamaguiText>
            )}
          </XStack>

          {/* Right side: New chat button */}
          <XStack alignItems="center" width={36} justifyContent="flex-end">
            {!searchExpanded && !hideNewChatButton && (
              <Pressable
                onPress={() => setShowNewChatMenu(true)}
                hitSlop={8}
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
            )}
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
