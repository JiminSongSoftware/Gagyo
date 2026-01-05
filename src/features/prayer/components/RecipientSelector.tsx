/**
 * Recipient Selector Component
 *
 * Modal/sheet for selecting prayer card recipients.
 * Features:
 * - Three tabs: Individual, Small Group, Church-wide
 * - Individual: multi-select members with checkboxes
 * - Small Group: single-select small group with radio buttons
 * - Church-wide: informational text (no selection needed)
 * - i18n support for English and Korean
 */

import { useState, useEffect, useCallback } from 'react';
import { Pressable, ScrollView, ActivityIndicator, View as RNView } from 'react-native';
import {
  Stack,
  Text as TamaguiText,
  XStack,
  YStack,
  Checkbox,
  RadioGroup,
  RadioIndicator,
  useTheme,
  styled,
} from 'tamagui';
import { useTranslation } from '@/i18n';
import { supabase } from '@/lib/supabase';
import type { PrayerCardRecipientScope } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

export interface Member {
  membership_id: string;
  display_name: string | null;
  photo_url: string | null;
}

export interface SmallGroup {
  id: string;
  name: string;
  leader_name?: string | null;
}

export type RecipientSelectorTab = 'individual' | 'small_group' | 'church_wide';

export interface RecipientSelectorProps {
  /**
   * The tenant ID to fetch members/groups from.
   */
  tenantId: string;

  /**
   * The current user's membership ID (filtered from list).
   */
  currentMembershipId: string;

  /**
   * Callback when user confirms selections.
   * @param scope - The selected recipient scope
   * @param recipientIds - Array of selected recipient IDs (membership IDs or small group IDs)
   */
  onConfirm: (scope: PrayerCardRecipientScope, recipientIds: string[]) => void;

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

const TabButton = styled(Pressable, {
  name: 'TabButton',
  flex: 1,
  paddingVertical: '$2',
  alignItems: 'center',
  borderBottomWidth: 2,
  borderBottomColor: '$transparent',
});

const ListItem = styled(Pressable, {
  name: 'ListItem',
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  borderBottomWidth: 1,
  borderBottomColor: '$borderLight',
  backgroundColor: '$background',
});

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

const SmallGroupIcon = styled(Stack, {
  name: 'SmallGroupIcon',
  width: 40,
  height: 40,
  borderRadius: 8,
  backgroundColor: '$accentLight',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RecipientSelector({
  tenantId,
  currentMembershipId,
  onConfirm,
  onCancel,
  visible,
}: RecipientSelectorProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<RecipientSelectorTab>('individual');
  const [members, setMembers] = useState<Member[]>([]);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedSmallGroupId, setSelectedSmallGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch members (individual tab)
  useEffect(() => {
    if (!visible || !tenantId || activeTab !== 'individual') return;

    const fetchMembers = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('memberships')
          .select(
            `
            id,
            user_id,
            users!inner (
              display_name,
              photo_url
            )
          `
          )
          .eq('tenant_id', tenantId)
          .eq('status', 'active');

        if (fetchError) throw fetchError;

        // Transform data and filter out current user
        const transformedData =
          data
            ?.map((item) => ({
              membership_id: item.id,
              display_name: item.users?.display_name ?? null,
              photo_url: item.users?.photo_url ?? null,
            }))
            .filter((m) => m.membership_id !== currentMembershipId) ?? [];

        setMembers(transformedData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void fetchMembers();
  }, [visible, tenantId, currentMembershipId, activeTab]);

  // Fetch small groups (small group tab)
  useEffect(() => {
    if (!visible || !tenantId || activeTab !== 'small_group') return;

    const fetchSmallGroups = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('small_groups')
          .select(
            `
            id,
            name,
            leader_id,
            memberships!small_groups_leader_id_fkey (
              user:users!memberships_user_id_fkey (
                display_name
              )
            )
          `
          )
          .eq('tenant_id', tenantId);

        if (fetchError) throw fetchError;

        const transformedData =
          data?.map((item) => ({
            id: item.id,
            name: item.name,
            leader_name: item.memberships?.user?.display_name ?? null,
          })) ?? [];

        setSmallGroups(transformedData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void fetchSmallGroups();
  }, [visible, tenantId, activeTab]);

  // Reset selections when modal closes
  useEffect(() => {
    if (!visible) {
      setActiveTab('individual');
      setSelectedMemberIds(new Set());
      setSelectedSmallGroupId(null);
    }
  }, [visible]);

  const toggleMemberSelection = useCallback((membershipId: string) => {
    setSelectedMemberIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(membershipId)) {
        newSet.delete(membershipId);
      } else {
        newSet.add(membershipId);
      }
      return newSet;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    switch (activeTab) {
      case 'individual':
        if (selectedMemberIds.size > 0) {
          onConfirm('individual', Array.from(selectedMemberIds));
        }
        break;
      case 'small_group':
        if (selectedSmallGroupId) {
          onConfirm('small_group', [selectedSmallGroupId]);
        }
        break;
      case 'church_wide':
        onConfirm('church_wide', []);
        break;
    }
  }, [activeTab, selectedMemberIds, selectedSmallGroupId, onConfirm]);

  const canConfirm =
    (activeTab === 'individual' && selectedMemberIds.size > 0) ||
    (activeTab === 'small_group' && selectedSmallGroupId !== null) ||
    activeTab === 'church_wide';

  if (!visible) return null;

  return (
    <ModalOverlay testID="recipient-selector-modal">
      <ModalContent>
        {/* Header */}
        <YStack padding="$4" borderBottomWidth={1} borderBottomColor="$borderLight">
          <TamaguiText
            fontSize="$lg"
            fontWeight="bold"
            color="$color"
            testID="recipient-selector-title"
          >
            {t('prayer.recipient_selector_title')}
          </TamaguiText>
        </YStack>

        {/* Tabs */}
        <XStack borderBottomWidth={1} borderBottomColor="$borderLight">
          <TabButton testID="tab-individual" onPress={() => setActiveTab('individual')}>
            <TamaguiText
              fontSize="$sm"
              color={activeTab === 'individual' ? '$primary' : '$color3'}
              fontWeight={activeTab === 'individual' ? 'bold' : 'normal'}
            >
              {t('prayer.recipient_selector_individual')}
            </TamaguiText>
          </TabButton>
          <TabButton testID="tab-small-group" onPress={() => setActiveTab('small_group')}>
            <TamaguiText
              fontSize="$sm"
              color={activeTab === 'small_group' ? '$primary' : '$color3'}
              fontWeight={activeTab === 'small_group' ? 'bold' : 'normal'}
            >
              {t('prayer.recipient_selector_small_group')}
            </TamaguiText>
          </TabButton>
          <TabButton testID="tab-church-wide" onPress={() => setActiveTab('church_wide')}>
            <TamaguiText
              fontSize="$sm"
              color={activeTab === 'church_wide' ? '$primary' : '$color3'}
              fontWeight={activeTab === 'church_wide' ? 'bold' : 'normal'}
            >
              {t('prayer.recipient_selector_church_wide')}
            </TamaguiText>
          </TabButton>
        </XStack>

        {/* Error state */}
        {error && (
          <YStack padding="$4" backgroundColor="$dangerLight" testID="recipient-error">
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
              Loading...
            </TamaguiText>
          </YStack>
        )}

        {/* Content area */}
        {!loading && (
          <ScrollView
            testID="recipient-list"
            style={{ maxHeight: 300 }}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* Individual tab */}
            {activeTab === 'individual' && (
              <>
                {members.length === 0 ? (
                  <YStack padding="$4" alignItems="center">
                    <TamaguiText fontSize="$sm" color="$color3">
                      No other members available
                    </TamaguiText>
                  </YStack>
                ) : (
                  members.map((member) => {
                    const isSelected = selectedMemberIds.has(member.membership_id);
                    return (
                      <ListItem
                        key={member.membership_id}
                        testID={`member-${member.display_name || 'Unknown'}`}
                        onPress={() => toggleMemberSelection(member.membership_id)}
                      >
                        <Avatar>
                          {member.photo_url ? (
                            <AvatarImage uri={member.photo_url} />
                          ) : (
                            <TamaguiText fontSize="$sm" color="white">
                              {(member.display_name || '?')[0].toUpperCase()}
                            </TamaguiText>
                          )}
                        </Avatar>
                        <TamaguiText fontSize="$md" color="$color" flex={1} numberOfLines={1}>
                          {member.display_name || 'Unknown User'}
                        </TamaguiText>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleMemberSelection(member.membership_id)}
                        >
                          <Checkbox.Indicator />
                        </Checkbox>
                      </ListItem>
                    );
                  })
                )}
              </>
            )}

            {/* Small Group tab */}
            {activeTab === 'small_group' && (
              <>
                {smallGroups.length === 0 ? (
                  <YStack padding="$4" alignItems="center">
                    <TamaguiText fontSize="$sm" color="$color3">
                      No small groups available
                    </TamaguiText>
                  </YStack>
                ) : (
                  <RadioGroup
                    value={selectedSmallGroupId ?? ''}
                    onValueChange={setSelectedSmallGroupId}
                  >
                    {smallGroups.map((group) => {
                      const isSelected = selectedSmallGroupId === group.id;
                      return (
                        <ListItem
                          key={group.id}
                          testID={`group-${group.name}`}
                          onPress={() => setSelectedSmallGroupId(group.id)}
                        >
                          <SmallGroupIcon>
                            <TamaguiText fontSize="$sm" color="white">
                              SG
                            </TamaguiText>
                          </SmallGroupIcon>
                          <YStack flex={1}>
                            <TamaguiText fontSize="$md" color="$color" numberOfLines={1}>
                              {group.name}
                            </TamaguiText>
                            {group.leader_name && (
                              <TamaguiText fontSize="$xs" color="$color3">
                                Leader: {group.leader_name}
                              </TamaguiText>
                            )}
                          </YStack>
                          <RNView style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <RadioIndicator checked={isSelected} />
                          </RNView>
                        </ListItem>
                      );
                    })}
                  </RadioGroup>
                )}
              </>
            )}

            {/* Church-wide tab */}
            {activeTab === 'church_wide' && (
              <YStack padding="$4" alignItems="center" gap="$2">
                <TamaguiText fontSize="$md" color="$color" textAlign="center">
                  {t('prayer.recipient_church_wide_description')}
                </TamaguiText>
                <TamaguiText fontSize="$sm" color="$color3" textAlign="center">
                  This prayer will be visible to all church members.
                </TamaguiText>
              </YStack>
            )}
          </ScrollView>
        )}

        {/* Selected count */}
        {!loading && activeTab === 'individual' && members.length > 0 && (
          <YStack padding="$3" borderTopWidth={1} borderTopColor="$borderLight" alignItems="center">
            <TamaguiText fontSize="$sm" color="$color3">
              {t('prayer.recipients_selected', { count: selectedMemberIds.size })}
            </TamaguiText>
          </YStack>
        )}

        {/* Footer buttons */}
        <XStack padding="$4" borderTopWidth={1} borderTopColor="$borderLight" gap="$2">
          <Pressable testID="recipient-cancel-button" onPress={onCancel} style={{ flex: 1 }}>
            <Stack
              flex={1}
              padding="$3"
              borderRadius="$2"
              backgroundColor="$backgroundTertiary"
              alignItems="center"
            >
              <TamaguiText fontSize="$md" color="$color">
                {t('common.cancel')}
              </TamaguiText>
            </Stack>
          </Pressable>

          <Pressable
            testID="recipient-confirm-button"
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
              <TamaguiText fontSize="$md" color={canConfirm ? 'white' : '$color3'}>
                {t('common.confirm')}
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

function AvatarImage({ uri: _uri }: { uri: string }) {
  return (
    <Stack
      width={40}
      height={40}
      borderRadius={20}
      overflow="hidden"
      backgroundColor="$primaryLight"
    >
      {/* Image component would go here */}
      {/* <Image source={{ uri }} style={{ width: 40, height: 40 }} /> */}
      <TamaguiText fontSize="$xs" color="$color3" padding="$2">
        Avatar
      </TamaguiText>
    </Stack>
  );
}
