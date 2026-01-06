/**
 * Create Pastoral Journal Form Component
 *
 * Form for creating new pastoral journals with:
 * - Week selector (defaults to current week)
 * - Attendance counters
 * - Prayer requests, highlights, concerns, next steps inputs
 * - Draft and submit actions
 * - Form validation
 * - i18n support
 */

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView } from 'react-native';
import {
  Stack,
  Text as TamaguiText,
  XStack,
  YStack,
  Button,
  Input,
  styled,
  useTheme,
} from 'tamagui';
import { useTranslation } from '@/i18n';
import {
  useCreatePastoralJournal,
  type PastoralJournalContent,
} from '../hooks/useCreatePastoralJournal';
import type { Membership } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

export interface CreatePastoralJournalFormProps {
  /**
   * The tenant ID for the journal.
   */
  tenantId: string | null;

  /**
   * The small group ID (leader's group).
   */
  smallGroupId: string | null;

  /**
   * The current user's membership ID.
   */
  membershipId: string | null;

  /**
   * The current user's membership.
   */
  membership: Membership | null;

  /**
   * Callback when journal is created successfully.
   */
  onSuccess?: (journalId: string) => void;

  /**
   * Callback when form is cancelled.
   */
  onCancel: () => void;

  /**
   * Initial week start date (ISO format).
   */
  initialWeekStartDate?: string;
}

type AttendanceField = 'present' | 'absent' | 'newVisitors';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_ARRAY_ITEMS = 10;
const MAX_STRING_LENGTH = 500;

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const FormSection = styled(YStack, {
  name: 'FormSection',
  backgroundColor: '$backgroundTertiary',
  borderRadius: '$3',
  padding: '$4',
  marginBottom: '$4',
});

const CounterButton = styled(Pressable, {
  name: 'CounterButton',
  width: 36,
  height: 36,
  borderRadius: '$2',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$borderLight',
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function getWeekRange(weekStartDate: string): { start: Date; end: Date } {
  const start = new Date(weekStartDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface AttendanceCounterProps {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  color?: string;
  testID?: string;
}

function AttendanceCounter({
  label,
  value,
  onIncrement,
  onDecrement,
  color,
  testID,
}: AttendanceCounterProps) {
  return (
    <YStack testID={testID} alignItems="center" gap="$2">
      <TamaguiText fontSize="$sm" color="$color3">
        {label}
      </TamaguiText>
      <XStack alignItems="center" gap="$3">
        <CounterButton testID={testID ? `${testID}-decrement` : undefined} onPress={onDecrement}>
          <TamaguiText fontSize="$lg" color="$color">
            −
          </TamaguiText>
        </CounterButton>
        <TamaguiText
          testID={testID ? `${testID}-value` : undefined}
          fontSize="$2xl"
          fontWeight="bold"
          color={color || '$color'}
          minWidth={40}
          textAlign="center"
        >
          {value}
        </TamaguiText>
        <CounterButton testID={testID ? `${testID}-increment` : undefined} onPress={onIncrement}>
          <TamaguiText fontSize="$lg" color="$color">
            +
          </TamaguiText>
        </CounterButton>
      </XStack>
    </YStack>
  );
}

interface ArrayInputProps {
  label: string;
  items: string[];
  onItemsChange: (items: string[]) => void;
  placeholder: string;
  testID: string;
}

function ArrayInput({ label, items, onItemsChange, placeholder, testID }: ArrayInputProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (items.length >= MAX_ARRAY_ITEMS) {
      Alert.alert(t('pastoral.max_items_reached', { max: MAX_ARRAY_ITEMS.toString() }));
      return;
    }
    if (trimmed.length > MAX_STRING_LENGTH) {
      Alert.alert(t('pastoral.max_length_exceeded', { max: MAX_STRING_LENGTH.toString() }));
      return;
    }
    onItemsChange([...items, trimmed]);
    setNewItem('');
  };

  const handleRemoveItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  return (
    <YStack gap="$2">
      <XStack justifyContent="space-between" alignItems="center">
        <TamaguiText fontSize="$sm" fontWeight="bold" color="$color">
          {label}
        </TamaguiText>
        <TamaguiText fontSize="$xs" color="$color3">
          {items.length} / {MAX_ARRAY_ITEMS}
        </TamaguiText>
      </XStack>

      {/* Existing Items */}
      {items.map((item, index) => (
        <XStack
          key={index}
          backgroundColor="$background"
          borderRadius="$2"
          padding="$2"
          alignItems="center"
          justifyContent="space-between"
        >
          <TamaguiText fontSize="$sm" color="$color" flex={1}>
            {item}
          </TamaguiText>
          <Pressable onPress={() => handleRemoveItem(index)} hitSlop={8}>
            <TamaguiText fontSize="$lg" color="$error" paddingHorizontal="$2">
              ×
            </TamaguiText>
          </Pressable>
        </XStack>
      ))}

      {/* Add New Item */}
      <XStack gap="$2">
        <Stack
          flex={1}
          borderWidth={1}
          borderColor="$borderLight"
          borderRadius="$2"
          backgroundColor="$background"
          padding="$2"
        >
          <Input
            testID={testID}
            value={newItem}
            onChangeText={setNewItem}
            placeholder={placeholder}
            placeholderTextColor={theme.color3?.val}
            borderWidth={0}
            backgroundColor="transparent"
            style={{ fontSize: 16, color: theme.color?.val }}
            onSubmitEditing={handleAddItem}
          />
        </Stack>
        <Button
          size="$3"
          backgroundColor="$primary"
          color="white"
          onPress={handleAddItem}
          disabled={!newItem.trim() || items.length >= MAX_ARRAY_ITEMS}
        >
          <TamaguiText color="white">{t('common.add')}</TamaguiText>
        </Button>
      </XStack>
    </YStack>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreatePastoralJournalForm({
  tenantId,
  smallGroupId,
  membershipId,
  membership,
  onSuccess,
  onCancel,
  initialWeekStartDate,
}: CreatePastoralJournalFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  // Week state
  const [weekStartDate, setWeekStartDate] = useState(
    () => initialWeekStartDate || getWeekMonday(new Date())
  );

  // Attendance state
  const [attendance, setAttendance] = useState({
    present: 0,
    absent: 0,
    newVisitors: 0,
  });

  // Content arrays
  const [prayerRequests, setPrayerRequests] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);

  const { createJournal, creating, error } = useCreatePastoralJournal(
    tenantId,
    smallGroupId,
    membershipId
  );

  const handleAttendanceChange = (field: AttendanceField, delta: number) => {
    setAttendance((prev) => {
      const newValue = prev[field] + delta;
      if (newValue < 0 || newValue > 9999) return prev;
      return { ...prev, [field]: newValue };
    });
  };

  const handleSaveAsDraft = async () => {
    try {
      const content: PastoralJournalContent = {};

      // Only include non-empty fields
      if (attendance.present > 0 || attendance.absent > 0 || attendance.newVisitors > 0) {
        content.attendance = attendance;
      }
      if (prayerRequests.length > 0) {
        content.prayerRequests = prayerRequests;
      }
      if (highlights.length > 0) {
        content.highlights = highlights;
      }
      if (concerns.length > 0) {
        content.concerns = concerns;
      }
      if (nextSteps.length > 0) {
        content.nextSteps = nextSteps;
      }

      // Validate at least one field has content
      const hasContent =
        content.attendance ||
        content.prayerRequests ||
        content.highlights ||
        content.concerns ||
        content.nextSteps;

      if (!hasContent) {
        Alert.alert(t('pastoral.validation_error'), t('pastoral.add_content'));
        return;
      }

      const journalId = await createJournal({
        weekStartDate,
        content,
        submitForReview: false,
      });

      if (journalId) {
        onSuccess?.(journalId);
      }
    } catch (err) {
      const message = (err as Error).message;
      Alert.alert(t('pastoral.create_error'), message);
    }
  };

  const handleSaveAndSubmit = async () => {
    try {
      const content: PastoralJournalContent = {};

      // For submission, attendance is required
      if (attendance.present === 0 && attendance.absent === 0 && attendance.newVisitors === 0) {
        Alert.alert(t('pastoral.validation_error'), t('pastoral.attendance_required'));
        return;
      }

      content.attendance = attendance;
      if (prayerRequests.length > 0) {
        content.prayerRequests = prayerRequests;
      }
      if (highlights.length > 0) {
        content.highlights = highlights;
      }
      if (concerns.length > 0) {
        content.concerns = concerns;
      }
      if (nextSteps.length > 0) {
        content.nextSteps = nextSteps;
      }

      // Confirm submission
      Alert.alert(t('pastoral.confirm_submit_title'), t('pastoral.confirm_submit_message'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'default',
          onPress: () => {
            void (async () => {
              try {
                const journalId = await createJournal({
                  weekStartDate,
                  content,
                  submitForReview: true,
                });

                if (journalId) {
                  onSuccess?.(journalId);
                }
              } catch (submitError) {
                Alert.alert(t('pastoral.create_error'), (submitError as Error).message);
              }
            })();
          },
        },
      ]);
    } catch (err) {
      Alert.alert(t('pastoral.create_error'), (err as Error).message);
    }
  };

  const weekRange = getWeekRange(weekStartDate);

  // Only leaders and co-leaders can create journals
  const canCreate = membership?.role === 'small_group_leader' || membership?.role === 'co_leader';

  if (!canCreate) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
        <TamaguiText fontSize="$6" color="$color4">
          🔒
        </TamaguiText>
        <TamaguiText
          fontSize="$lg"
          fontWeight="600"
          color="$color"
          marginTop="$4"
          textAlign="center"
        >
          {t('pastoral.no_permission')}
        </TamaguiText>
        <TamaguiText fontSize="$sm" color="$color3" marginTop="$2" textAlign="center">
          {t('pastoral.only_leaders_can_create')}
        </TamaguiText>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        alignItems="center"
        padding="$4"
        borderBottomWidth={1}
        borderBottomColor="$borderLight"
      >
        <Pressable
          testID="back-button"
          onPress={onCancel}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <TamaguiText fontSize="$2xl" color="$color">
            ←
          </TamaguiText>
        </Pressable>
        <TamaguiText
          fontSize="$lg"
          fontWeight="bold"
          color="$color"
          flex={1}
          textAlign="center"
          marginRight="$6"
        >
          {t('pastoral.create_journal')}
        </TamaguiText>
      </XStack>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Week Selector */}
        <FormSection testID="week-selector">
          <TamaguiText fontSize="$sm" fontWeight="bold" color="$color" marginBottom="$3">
            {t('pastoral.week')}
          </TamaguiText>
          <XStack
            justifyContent="space-between"
            alignItems="center"
            backgroundColor="$background"
            borderRadius="$2"
            padding="$3"
          >
            <Pressable
              testID="week-selector-prev"
              onPress={() => {
                const newDate = new Date(weekStartDate);
                newDate.setDate(newDate.getDate() - 7);
                setWeekStartDate(getWeekMonday(newDate));
              }}
            >
              <TamaguiText fontSize="$lg" color="$primary">
                ←
              </TamaguiText>
            </Pressable>
            <TamaguiText testID="week-selector-date" fontSize="$md" fontWeight="600" color="$color">
              {formatDate(weekRange.start)} - {formatDate(weekRange.end)}
            </TamaguiText>
            <Pressable
              testID="week-selector-next"
              onPress={() => {
                const newDate = new Date(weekStartDate);
                newDate.setDate(newDate.getDate() + 7);
                setWeekStartDate(getWeekMonday(newDate));
              }}
            >
              <TamaguiText fontSize="$lg" color="$primary">
                →
              </TamaguiText>
            </Pressable>
          </XStack>
        </FormSection>

        {/* Attendance Section */}
        <FormSection>
          <TamaguiText fontSize="$sm" fontWeight="bold" color="$color" marginBottom="$4">
            {t('pastoral.attendance')}
          </TamaguiText>
          <XStack justifyContent="space-around" flexWrap="wrap" gap="$4">
            <AttendanceCounter
              testID="attendance-present-input"
              label={t('pastoral.present')}
              value={attendance.present}
              onIncrement={() => handleAttendanceChange('present', 1)}
              onDecrement={() => handleAttendanceChange('present', -1)}
            />
            <AttendanceCounter
              testID="attendance-absent-input"
              label={t('pastoral.absent')}
              value={attendance.absent}
              onIncrement={() => handleAttendanceChange('absent', 1)}
              onDecrement={() => handleAttendanceChange('absent', -1)}
              color="$error"
            />
            <AttendanceCounter
              testID="attendance-new-visitors-input"
              label={t('pastoral.new_visitors')}
              value={attendance.newVisitors}
              onIncrement={() => handleAttendanceChange('newVisitors', 1)}
              onDecrement={() => handleAttendanceChange('newVisitors', -1)}
              color="$primary"
            />
          </XStack>
        </FormSection>

        {/* Prayer Requests */}
        <ArrayInput
          label={t('pastoral.prayer_requests')}
          items={prayerRequests}
          onItemsChange={setPrayerRequests}
          placeholder={t('pastoral.prayer_request_placeholder')}
          testID="prayer-requests-input"
        />

        {/* Highlights */}
        <ArrayInput
          label={t('pastoral.highlights')}
          items={highlights}
          onItemsChange={setHighlights}
          placeholder={t('pastoral.highlight_placeholder')}
          testID="highlights-input"
        />

        {/* Concerns */}
        <ArrayInput
          label={t('pastoral.concerns')}
          items={concerns}
          onItemsChange={setConcerns}
          placeholder={t('pastoral.concern_placeholder')}
          testID="concerns-input"
        />

        {/* Next Steps */}
        <ArrayInput
          label={t('pastoral.next_steps')}
          items={nextSteps}
          onItemsChange={setNextSteps}
          placeholder={t('pastoral.next_step_placeholder')}
          testID="next-steps-input"
        />

        {/* Error Display */}
        {error && (
          <Stack
            marginTop="$4"
            padding="$3"
            borderRadius="$2"
            backgroundColor="$errorLight"
            borderWidth={1}
            borderColor="$error"
          >
            <TamaguiText fontSize="$sm" color="$error">
              {error.message}
            </TamaguiText>
          </Stack>
        )}

        {/* Action Buttons */}
        <XStack gap="$3" marginTop="$6" paddingBottom="$8">
          <Button
            testID="cancel-button"
            flex={1}
            size="$4"
            backgroundColor="$backgroundTertiary"
            color="$color"
            onPress={onCancel}
            disabled={creating}
          >
            <TamaguiText>{t('common.cancel')}</TamaguiText>
          </Button>

          <Button
            testID="save-draft-button"
            flex={1}
            size="$4"
            backgroundColor="$backgroundTertiary"
            color="$color"
            onPress={handleSaveAsDraft}
            disabled={creating}
          >
            {creating ? (
              <XStack alignItems="center" gap="$2">
                <ActivityIndicator size="small" color={theme.color?.val} />
                <TamaguiText>{t('common.saving')}</TamaguiText>
              </XStack>
            ) : (
              <TamaguiText>{t('pastoral.save_draft')}</TamaguiText>
            )}
          </Button>

          <Button
            testID="save-and-submit-button"
            flex={1}
            size="$4"
            backgroundColor="$primary"
            color="white"
            onPress={handleSaveAndSubmit}
            disabled={creating}
          >
            {creating ? (
              <XStack alignItems="center" gap="$2">
                <ActivityIndicator size="small" color="white" />
                <TamaguiText color="white">{t('common.submitting')}</TamaguiText>
              </XStack>
            ) : (
              <TamaguiText color="white">{t('pastoral.submit')}</TamaguiText>
            )}
          </Button>
        </XStack>
      </ScrollView>
    </YStack>
  );
}

CreatePastoralJournalForm.displayName = 'CreatePastoralJournalForm';
