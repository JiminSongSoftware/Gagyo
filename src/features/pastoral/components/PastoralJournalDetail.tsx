/**
 * Pastoral Journal Detail Component
 *
 * Displays full pastoral journal with comments and action buttons.
 *
 * Features:
 * - Full journal content (attendance, prayer requests, highlights, concerns, next steps)
 * - Status badge with color coding
 * - Author info and timestamps
 * - Comments section (zone leaders and pastors only)
 * - Role-based action buttons (submit, forward, confirm)
 * - i18n support
 */

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import {
  Stack,
  Text as TamaguiText,
  XStack,
  YStack,
  Button,
  useTheme,
  styled,
  TextArea,
} from 'tamagui';
import { useTranslation } from '@/i18n';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { usePastoralJournalById } from '../hooks/usePastoralJournals';
import {
  useUpdatePastoralJournalStatus,
  useCanUpdateStatus,
} from '../hooks/useUpdatePastoralJournalStatus';
import {
  usePastoralJournalComments,
  useAddPastoralJournalComment,
  useCanAddComment,
  type PastoralJournalCommentWithAuthor,
} from '../hooks/usePastoralJournalComments';
import type { Database, Membership } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

type PastoralJournalStatus = Database['public']['Tables']['pastoral_journals']['Row']['status'];

export interface PastoralJournalDetailProps {
  /**
   * The pastoral journal ID to display.
   */
  journalId: string | null;

  /**
   * The tenant ID for RLS.
   */
  tenantId: string | null;

  /**
   * The current user's membership.
   */
  membership: Membership | null;

  /**
   * Callback when back is pressed.
   */
  onBack: () => void;
}

type PastoralJournalContent = {
  attendance?: {
    present: number;
    absent: number;
    newVisitors: number;
  };
  prayerRequests?: string[];
  highlights?: string[];
  concerns?: string[];
  nextSteps?: string[];
};

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const StatusBadge = styled(Stack, {
  name: 'StatusBadge',
  paddingHorizontal: '$3',
  paddingVertical: '$1',
  borderRadius: '$2',
  alignSelf: 'flex-start',
});

const SectionCard = styled(Stack, {
  name: 'SectionCard',
  backgroundColor: '$backgroundTertiary',
  borderRadius: '$3',
  padding: '$4',
  marginBottom: '$4',
});

interface SectionCardProps {
  children: React.ReactNode;
  testID?: string;
}

function SectionCardWithTestID({ children, testID }: SectionCardProps) {
  return <SectionCard testID={testID}>{children}</SectionCard>;
}

const CommentBubble = styled(Stack, {
  name: 'CommentBubble',
  backgroundColor: '$backgroundTertiary',
  borderRadius: '$3',
  padding: '$3',
  marginBottom: '$3',
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusColor(status: PastoralJournalStatus): string {
  switch (status) {
    case 'draft':
      return '#9CA3AF';
    case 'submitted':
      return '#3B82F6';
    case 'zone_reviewed':
      return '#F59E0B';
    case 'pastor_confirmed':
      return '#10B981';
    default:
      return '#9CA3AF';
  }
}

function getStatusLabel(status: PastoralJournalStatus, t: (key: string) => string): string {
  switch (status) {
    case 'draft':
      return t('pastoral.status_draft');
    case 'submitted':
      return t('pastoral.status_submitted');
    case 'zone_reviewed':
      return t('pastoral.status_zone_reviewed');
    case 'pastor_confirmed':
      return t('pastoral.status_pastor_confirmed');
    default:
      return status;
  }
}

function formatWeekDate(weekStartDate: string): string {
  const date = new Date(weekStartDate);
  const endDate = new Date(date);
  endDate.setDate(date.getDate() + 6);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return `${formatDate(date)} - ${formatDate(endDate)}`;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  testID?: string;
}

function ActionButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  testID,
}: ActionButtonProps) {
  const theme = useTheme();

  return (
    <Button
      testID={testID}
      flex={1}
      size="$4"
      backgroundColor={variant === 'primary' ? '$primary' : '$backgroundTertiary'}
      color={variant === 'primary' ? 'white' : '$color'}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <XStack alignItems="center" gap="$2">
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? 'white' : theme.color?.val}
          />
          <TamaguiText color={variant === 'primary' ? 'white' : '$color'}>{label}</TamaguiText>
        </XStack>
      ) : (
        <TamaguiText color={variant === 'primary' ? 'white' : '$color'}>{label}</TamaguiText>
      )}
    </Button>
  );
}

interface CommentItemProps {
  comment: PastoralJournalCommentWithAuthor;
}

function CommentItem({ comment }: CommentItemProps) {
  const { t } = useTranslation();

  return (
    <CommentBubble>
      {/* Author and Time */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
        <TamaguiText fontSize="$sm" fontWeight="600" color="$color">
          {comment.author?.user?.display_name || t('pastoral.unknown_author')}
        </TamaguiText>
        <TamaguiText fontSize="$xs" color="$color3">
          {formatDateTime(comment.created_at)}
        </TamaguiText>
      </XStack>

      {/* Comment Content */}
      <TamaguiText fontSize="$sm" color="$color">
        {comment.content}
      </TamaguiText>
    </CommentBubble>
  );
}

interface CommentFormProps {
  journalId: string;
  tenantId: string;
  membershipId: string;
  membership: Membership | null;
  onCommentAdded: () => void;
}

function CommentForm({
  journalId,
  tenantId,
  membershipId,
  membership,
  onCommentAdded,
}: CommentFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [content, setContent] = useState('');
  const { addComment, adding, error } = useAddPastoralJournalComment(
    tenantId,
    journalId,
    membershipId,
    membership
  );

  const handleSubmit = async () => {
    try {
      await addComment(content);
      setContent('');
      onCommentAdded();
    } catch {
      // Error handled by hook
    }
  };

  const canComment = useCanAddComment(membership);

  if (!canComment) {
    return null;
  }

  return (
    <YStack gap="$2" marginTop="$4">
      <TamaguiText fontSize="$sm" fontWeight="600" color="$color">
        {t('pastoral.add_comment')}
      </TamaguiText>

      <Stack
        borderWidth={1}
        borderColor="$borderLight"
        borderRadius="$2"
        backgroundColor="$background"
        padding="$2"
      >
        <TextArea
          testID="comment-input"
          value={content}
          onChangeText={setContent}
          placeholder={t('pastoral.comment_placeholder')}
          placeholderTextColor={theme.color3?.val}
          style={{
            fontSize: 16,
            color: theme.color?.val,
            minHeight: 80,
            maxHeight: 150,
          }}
          editable={!adding}
        />
      </Stack>

      {error && (
        <TamaguiText fontSize="$xs" color="$error">
          {error.message}
        </TamaguiText>
      )}

      <Button
        testID="submit-comment-button"
        size="$3"
        backgroundColor="$primary"
        color="white"
        onPress={() => void handleSubmit()}
        disabled={!content.trim() || adding}
      >
        {adding ? (
          <XStack alignItems="center" gap="$2">
            <ActivityIndicator size="small" color="white" />
            <TamaguiText color="white">{t('common.sending')}</TamaguiText>
          </XStack>
        ) : (
          <TamaguiText color="white">{t('pastoral.send_comment')}</TamaguiText>
        )}
      </Button>
    </YStack>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PastoralJournalDetail({
  journalId,
  tenantId,
  membership,
  onBack,
}: PastoralJournalDetailProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const { journals, loading } = usePastoralJournalById(journalId);
  const journal = journals[0];

  const {
    comments,
    loading: commentsLoading,
    refetch: refetchComments,
  } = usePastoralJournalComments(journalId, tenantId);

  const {
    updateStatus,
    updating,
    error: updateError,
  } = useUpdatePastoralJournalStatus(tenantId, membership);

  const [showCommentError, setShowCommentError] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Call hooks unconditionally to satisfy React Hooks rules
  // Using default status when journal is null
  const journalStatus = journal?.status ?? 'draft';
  const canSubmitToReview = useCanUpdateStatus(membership, journalStatus, 'submitted');
  const canForwardToPastor = useCanUpdateStatus(membership, journalStatus, 'zone_reviewed');
  const canConfirmByPastor = useCanUpdateStatus(membership, journalStatus, 'pastor_confirmed');

  const handleSubmitForReview = () => {
    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!journal) return;
    setShowSubmitDialog(false);
    try {
      await updateStatus({ journalId: journal.id, newStatus: 'submitted' });
    } catch (err) {
      setShowCommentError((err as Error).message);
    }
  };

  const handleCancelSubmit = () => {
    setShowSubmitDialog(false);
  };

  const handleForwardToPastor = () => {
    setShowForwardDialog(true);
  };

  const handleConfirmForward = async () => {
    if (!journal) return;
    setShowForwardDialog(false);
    try {
      await updateStatus({ journalId: journal.id, newStatus: 'zone_reviewed' });
    } catch (err) {
      setShowCommentError((err as Error).message);
    }
  };

  const handleCancelForward = () => {
    setShowForwardDialog(false);
  };

  const handleConfirmJournal = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmConfirm = async () => {
    if (!journal) return;
    setShowConfirmDialog(false);
    try {
      await updateStatus({ journalId: journal.id, newStatus: 'pastor_confirmed' });
    } catch (err) {
      setShowCommentError((err as Error).message);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
  };

  const handleCommentAdded = () => {
    void refetchComments();
  };

  // Check if user can perform each action (also requires journal to exist)
  const canSubmit = !!(journal && canSubmitToReview);
  const canForward = !!(journal && canForwardToPastor);
  const canConfirm = !!(journal && canConfirmByPastor);

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator color={theme.primary?.val} />
      </YStack>
    );
  }

  if (!journal) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
        <TamaguiText fontSize={24} color="$color4">
          📝
        </TamaguiText>
        <TamaguiText fontSize="$lg" fontWeight="600" color="$color" marginTop="$4">
          {t('pastoral.journal_not_found')}
        </TamaguiText>
      </YStack>
    );
  }

  const content = journal.content as PastoralJournalContent | null;

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
          onPress={onBack}
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
          {t('pastoral.journal_details')}
        </TamaguiText>
      </XStack>

      <ScrollView>
        <YStack padding="$4" paddingBottom="$8">
          {/* Status Badge */}
          <StatusBadge backgroundColor={getStatusColor(journal.status) + '20'} marginBottom="$4">
            <TamaguiText fontSize="$sm" fontWeight="600" color={getStatusColor(journal.status)}>
              {getStatusLabel(journal.status, t)}
            </TamaguiText>
          </StatusBadge>

          {/* Week and Group */}
          <TamaguiText fontSize="$2xl" fontWeight="bold" color="$color" marginBottom="$2">
            {t('pastoral.week_of_date', { date: formatWeekDate(journal.week_start_date) })}
          </TamaguiText>
          {journal.small_group && (
            <TamaguiText fontSize="$md" color="$color3" marginBottom="$4">
              {journal.small_group.name}
            </TamaguiText>
          )}

          {/* Author and Timestamps */}
          <XStack gap="$4" marginBottom="$6" flexWrap="wrap">
            <XStack alignItems="center" gap="$1">
              <TamaguiText fontSize="$sm" color="$color3">
                {t('pastoral.author')}:
              </TamaguiText>
              <TamaguiText fontSize="$sm" fontWeight="600" color="$color">
                {journal.author?.user?.display_name || t('pastoral.unknown_author')}
              </TamaguiText>
            </XStack>
            <XStack alignItems="center" gap="$1">
              <TamaguiText fontSize="$sm" color="$color3">
                {t('pastoral.created')}:
              </TamaguiText>
              <TamaguiText fontSize="$sm" color="$color">
                {formatDateTime(journal.created_at)}
              </TamaguiText>
            </XStack>
            {journal.updated_at !== journal.created_at && (
              <XStack alignItems="center" gap="$1">
                <TamaguiText fontSize="$sm" color="$color3">
                  {t('pastoral.updated')}:
                </TamaguiText>
                <TamaguiText fontSize="$sm" color="$color">
                  {formatDateTime(journal.updated_at)}
                </TamaguiText>
              </XStack>
            )}
          </XStack>

          {/* Attendance Section */}
          {content?.attendance && (
            <SectionCardWithTestID testID="section-attendance">
              <TamaguiText fontSize="$md" fontWeight="bold" color="$color" marginBottom="$3">
                {t('pastoral.attendance')}
              </TamaguiText>
              <XStack gap="$4" flexWrap="wrap">
                <XStack alignItems="center" gap="$2">
                  <TamaguiText fontSize="$lg" fontWeight="bold" color="$color">
                    {content.attendance.present}
                  </TamaguiText>
                  <TamaguiText fontSize="$sm" color="$color3">
                    {t('pastoral.present')}
                  </TamaguiText>
                </XStack>
                <XStack alignItems="center" gap="$2">
                  <TamaguiText fontSize="$lg" fontWeight="bold" color="$error">
                    {content.attendance.absent}
                  </TamaguiText>
                  <TamaguiText fontSize="$sm" color="$color3">
                    {t('pastoral.absent')}
                  </TamaguiText>
                </XStack>
                {content.attendance.newVisitors > 0 && (
                  <XStack alignItems="center" gap="$2">
                    <TamaguiText fontSize="$lg" fontWeight="bold" color="$primary">
                      +{content.attendance.newVisitors}
                    </TamaguiText>
                    <TamaguiText fontSize="$sm" color="$color3">
                      {t('pastoral.new_visitors')}
                    </TamaguiText>
                  </XStack>
                )}
              </XStack>
            </SectionCardWithTestID>
          )}

          {/* Prayer Requests */}
          {content?.prayerRequests && content.prayerRequests.length > 0 && (
            <SectionCardWithTestID testID="section-prayer-requests">
              <TamaguiText fontSize="$md" fontWeight="bold" color="$color" marginBottom="$3">
                {t('pastoral.prayer_requests')}
              </TamaguiText>
              <YStack gap="$2">
                {content.prayerRequests.map((request, index) => (
                  <TamaguiText key={index} fontSize="$sm" color="$color">
                    • {request}
                  </TamaguiText>
                ))}
              </YStack>
            </SectionCardWithTestID>
          )}

          {/* Highlights */}
          {content?.highlights && content.highlights.length > 0 && (
            <SectionCardWithTestID testID="section-highlights">
              <TamaguiText fontSize="$md" fontWeight="bold" color="$color" marginBottom="$3">
                {t('pastoral.highlights')}
              </TamaguiText>
              <YStack gap="$2">
                {content.highlights.map((highlight, index) => (
                  <TamaguiText key={index} fontSize="$sm" color="$color">
                    • {highlight}
                  </TamaguiText>
                ))}
              </YStack>
            </SectionCardWithTestID>
          )}

          {/* Concerns */}
          {content?.concerns && content.concerns.length > 0 && (
            <SectionCardWithTestID testID="section-concerns">
              <TamaguiText fontSize="$md" fontWeight="bold" color="$color" marginBottom="$3">
                {t('pastoral.concerns')}
              </TamaguiText>
              <YStack gap="$2">
                {content.concerns.map((concern, index) => (
                  <TamaguiText key={index} fontSize="$sm" color="$color">
                    • {concern}
                  </TamaguiText>
                ))}
              </YStack>
            </SectionCardWithTestID>
          )}

          {/* Next Steps */}
          {content?.nextSteps && content.nextSteps.length > 0 && (
            <SectionCardWithTestID testID="section-next-steps">
              <TamaguiText fontSize="$md" fontWeight="bold" color="$color" marginBottom="$3">
                {t('pastoral.next_steps')}
              </TamaguiText>
              <YStack gap="$2">
                {content.nextSteps.map((step, index) => (
                  <TamaguiText key={index} fontSize="$sm" color="$color">
                    {index + 1}. {step}
                  </TamaguiText>
                ))}
              </YStack>
            </SectionCardWithTestID>
          )}

          {/* Comments Section */}
          <YStack gap="$3" marginTop="$4">
            <TamaguiText fontSize="$md" fontWeight="bold" color="$color">
              {t('pastoral.comments')} ({comments.length})
            </TamaguiText>

            {comments.length === 0 && !commentsLoading ? (
              <TamaguiText fontSize="$sm" color="$color3">
                {t('pastoral.no_comments_yet')}
              </TamaguiText>
            ) : (
              comments.map((comment) => <CommentItem key={comment.id} comment={comment} />)
            )}

            {commentsLoading && (
              <YStack alignItems="center" padding="$4">
                <ActivityIndicator color={theme.primary?.val} />
              </YStack>
            )}

            {/* Comment Form */}
            {membership && journal && (
              <CommentForm
                journalId={journal.id}
                tenantId={tenantId || ''}
                membershipId={membership.id}
                membership={membership}
                onCommentAdded={handleCommentAdded}
              />
            )}
          </YStack>

          {/* Action Buttons */}
          {(canSubmit || canForward || canConfirm) && (
            <XStack gap="$3" marginTop="$6">
              {canSubmit && (
                <ActionButton
                  testID="submit-for-review-button"
                  label={t('pastoral.submit_for_review')}
                  onPress={handleSubmitForReview}
                  loading={updating}
                />
              )}
              {canForward && (
                <ActionButton
                  testID="forward-to-pastor-button"
                  label={t('pastoral.forward_to_pastor')}
                  onPress={handleForwardToPastor}
                  loading={updating}
                />
              )}
              {canConfirm && (
                <ActionButton
                  testID="confirm-journal-button"
                  label={t('pastoral.confirm_journal')}
                  onPress={handleConfirmJournal}
                  loading={updating}
                />
              )}
            </XStack>
          )}

          {/* Error Display */}
          {(updateError || showCommentError) && (
            <Stack
              marginTop="$4"
              padding="$3"
              borderRadius="$2"
              backgroundColor="$errorLight"
              borderWidth={1}
              borderColor="$error"
            >
              <TamaguiText fontSize="$sm" color="$error">
                {updateError?.message || showCommentError}
              </TamaguiText>
            </Stack>
          )}
        </YStack>
      </ScrollView>

      {/* Confirmation Dialogs */}
      <AlertDialog
        visible={showSubmitDialog}
        titleKey="pastoral.confirm_submit_title"
        messageKey="pastoral.confirm_submit_message"
        confirmTextKey="common.confirm"
        cancelTextKey="common.cancel"
        testID="submit-confirmation-dialog"
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
        loading={updating}
      />

      <AlertDialog
        visible={showForwardDialog}
        titleKey="pastoral.confirm_forward_title"
        messageKey="pastoral.confirm_forward_message"
        confirmTextKey="common.confirm"
        cancelTextKey="common.cancel"
        testID="forward-confirmation-dialog"
        onConfirm={handleConfirmForward}
        onCancel={handleCancelForward}
        loading={updating}
      />

      <AlertDialog
        visible={showConfirmDialog}
        titleKey="pastoral.confirm_confirm_title"
        messageKey="pastoral.confirm_confirm_message"
        confirmTextKey="common.confirm"
        cancelTextKey="common.cancel"
        testID="confirm-confirmation-dialog"
        onConfirm={handleConfirmConfirm}
        onCancel={handleCancelConfirm}
        loading={updating}
      />
    </YStack>
  );
}

PastoralJournalDetail.displayName = 'PastoralJournalDetail';
