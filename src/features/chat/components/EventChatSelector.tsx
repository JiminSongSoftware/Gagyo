/**
 * Event Chat Selector Component
 *
 * Modal/sheet for selecting users to exclude from an Event Chat message.
 * Features:
 * - Displays conversation participants with checkboxes
 * - Max 5 selections enforced
 * - Current user filtered out
 * - i18n support for English and Korean
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Stack,
  Text as TamaguiText,
  XStack,
  YStack,
  Checkbox,
  useTheme,
  styled,
} from 'tamagui';
import { useTranslation } from '@/i18n';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationParticipant {
  membership_id: string;
  display_name: string | null;
  photo_url: string | null;
}

export interface EventChatSelectorProps {
  /**
   * The conversation ID to fetch participants from.
   */
  conversationId: string;

  /**
   * The tenant ID for the conversation.
   */
  tenantId: string;

  /**
   * The current user's membership ID (filtered from list).
   */
  currentMembershipId: string;

  /**
   * Callback when user confirms selections.
   * @param excludedMembershipIds - Array of selected membership IDs to exclude
   */
  onConfirm: (excludedMembershipIds: string[]) => void;

  /**
   * Callback when user cancels.
   */
  onCancel: () => void;

  /**
   * Whether the modal is visible.
   */
  visible: boolean;
}

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const ModalOverlay = styled(Stack, {
  name: 'ModalOverlay',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
});

const ModalContent = styled(Stack, {
  name: 'ModalContent',
  backgroundColor: '$background',
  borderRadius: '$4',
  width: '90%',
  maxWidth: 400,
  maxHeight: '80%',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 8,
});

const ParticipantItem = styled(Pressable, {
  name: 'ParticipantItem',
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  borderBottomWidth: 1,
  borderBottomColor: '$borderLight',
  backgroundColor: '$background',
} as any); // Pressable styling workaround

const Avatar = styled(Stack, {
  name: 'Avatar',
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '$primaryLight',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EventChatSelector({
  conversationId,
  tenantId,
  currentMembershipId,
  onConfirm,
  onCancel,
  visible,
}: EventChatSelectorProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [participants, setParticipants] = useState<
    ConversationParticipant[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_SELECTIONS = 5;

  // Fetch conversation participants
  useEffect(() => {
    if (!visible || !conversationId || !tenantId) return;

    const fetchParticipants = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('conversation_participants')
          .select(
            `
            membership_id,
            memberships!inner (
              user_id,
              users!inner (
                display_name,
                photo_url
              )
            )
          `
          )
          .eq('conversation_id', conversationId);

        if (fetchError) throw fetchError;

        // Transform data and filter out current user
        const transformedData =
          data
            ?.map((item: any) => ({
              membership_id: item.membership_id,
              display_name: item.memberships?.users?.display_name,
              photo_url: item.memberships?.users?.photo_url,
            }))
            .filter((p) => p.membership_id !== currentMembershipId) ?? [];

        setParticipants(transformedData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [visible, conversationId, tenantId, currentMembershipId]);

  // Reset selections when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedIds(new Set());
    }
  }, [visible]);

  const toggleSelection = useCallback(
    (membershipId: string) => {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);

        if (newSet.has(membershipId)) {
          newSet.delete(membershipId);
        } else if (newSet.size < MAX_SELECTIONS) {
          newSet.add(membershipId);
        }

        return newSet;
      });
    },
    [MAX_SELECTIONS]
  );

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(selectedIds));
  }, [selectedIds, onConfirm]);

  const isMaxReached = selectedIds.size >= MAX_SELECTIONS;
  const canConfirm = selectedIds.size > 0;

  if (!visible) return null;

  return (
    <ModalOverlay testID="event-chat-selector-modal">
      <ModalContent>
        {/* Header */}
        <YStack padding="$4" borderBottomWidth={1} borderBottomColor="$borderLight">
          <TamaguiText
            fontSize="$lg"
            fontWeight="bold"
            color="$color"
            testID="event-chat-selector-title"
          >
            {t('chat.event_chat_selector_title')}
          </TamaguiText>
          <TamaguiText
            fontSize="$sm"
            color="$color3"
            marginTop="$2"
          >
            {t('chat.event_chat_selector_description')}
          </TamaguiText>
        </YStack>

        {/* Error state */}
        {error && (
          <YStack padding="$4" backgroundColor="$dangerLight" testID="event-chat-error">
            <TamaguiText fontSize="$sm" color="$danger">
              {error}
            </TamaguiText>
          </YStack>
        )}

        {/* Loading state */}
        {loading && (
          <YStack padding="$4" alignItems="center">
            <ActivityIndicator size="small" color={theme.primary?.val} />
            <TamaguiText fontSize="$sm" color="$color3" marginTop="$2">
              Loading participants...
            </TamaguiText>
          </YStack>
        )}

        {/* Participant list */}
        {!loading && (
          <ScrollView
            testID="participant-list"
            style={{ maxHeight: 300 }}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {participants.length === 0 ? (
              <YStack padding="$4" alignItems="center">
                <TamaguiText fontSize="$sm" color="$color3">
                  No other participants in this conversation
                </TamaguiText>
              </YStack>
            ) : (
              participants.map((participant) => {
                const isSelected = selectedIds.has(participant.membership_id);
                const isDisabled = !isSelected && isMaxReached;

                return (
                  <ParticipantItem
                    key={participant.membership_id}
                    testID={`exclude-user-${participant.display_name || 'Unknown'}`}
                    onPress={() => !isDisabled && toggleSelection(participant.membership_id)}
                    disabled={isDisabled}
                    style={{ opacity: isDisabled ? 0.5 : 1 }}
                  >
                    {/* Avatar */}
                    <Avatar>
                      {participant.photo_url ? (
                        <AvatarImage uri={participant.photo_url} />
                      ) : (
                        <TamaguiText fontSize="$sm" color="white">
                          {(participant.display_name || '?')[0].toUpperCase()}
                        </TamaguiText>
                      )}
                    </Avatar>

                    {/* Name */}
                    <TamaguiText
                      fontSize="$md"
                      color="$color"
                      flex={1}
                      numberOfLines={1}
                    >
                      {participant.display_name || 'Unknown User'}
                    </TamaguiText>

                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() =>
                        !isDisabled && toggleSelection(participant.membership_id)
                      }
                    >
                      <Checkbox.Indicator />
                    </Checkbox>
                  </ParticipantItem>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Selected count */}
        {!loading && participants.length > 0 && (
          <YStack
            padding="$3"
            borderTopWidth={1}
            borderTopColor="$borderLight"
            alignItems="center"
          >
            <TamaguiText fontSize="$sm" color="$color3">
              {t('chat.event_chat_selected_count', { count: selectedIds.size })}
            </TamaguiText>
            {isMaxReached && (
              <TamaguiText
                testID="max-users-warning"
                fontSize="$xs"
                color="$danger"
                marginTop="$2"
              >
                {t('chat.event_chat_max_reached')}
              </TamaguiText>
            )}
          </YStack>
        )}

        {/* Footer buttons */}
        <XStack
          padding="$4"
          borderTopWidth={1}
          borderTopColor="$borderLight"
          gap="$2"
        >
          {/* Cancel button */}
          <Pressable
            testID="event-chat-cancel-button"
            onPress={onCancel}
            style={{ flex: 1 }}
          >
            <Stack
              flex={1}
              padding="$3"
              borderRadius="$2"
              backgroundColor="$backgroundTertiary"
              alignItems="center"
            >
              <TamaguiText fontSize="$md" color="$color">
                {t('chat.event_chat_cancel')}
              </TamaguiText>
            </Stack>
          </Pressable>

          {/* Confirm button */}
          <Pressable
            testID="event-chat-confirm-button"
            onPress={handleConfirm}
            disabled={!canConfirm}
            style={({ pressed }) => ({
              opacity: pressed || !canConfirm ? 0.5 : 1,
              flex: 1,
            })}
          >
            <Stack
              flex={1}
              padding="$3"
              borderRadius="$2"
              backgroundColor={canConfirm ? '$primary' : '$backgroundTertiary'}
              alignItems="center"
            >
              <TamaguiText
                fontSize="$md"
                color={canConfirm ? 'white' : '$color3'}
              >
                {t('chat.event_chat_confirm')}
              </TamaguiText>
            </Stack>
          </Pressable>
        </XStack>
      </ModalContent>
    </ModalOverlay>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function AvatarImage({ uri }: { uri: string }) {
  return (
    <Stack
      width={40}
      height={40}
      borderRadius={20}
      overflow="hidden"
      backgroundColor="$primaryLight"
    >
      {/* In a real implementation, this would use Image component */}
      {/* <Image source={{ uri }} style={{ width: 40, height: 40 }} /> */}
      <TamaguiText fontSize="$xs" color="$color3" padding="$2">
        Avatar
      </TamaguiText>
    </Stack>
  );
}
