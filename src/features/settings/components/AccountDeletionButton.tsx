/**
 * Account Deletion Button Component
 *
 * A destructive button for deleting user account with confirmation dialog.
 * This is a permanent action that cascades across all user data.
 *
 * Features:
 * - testID for E2E testing
 * - i18n support
 * - Confirmation dialog before deletion
 * - Loading state during deletion
 *
 * @module features/settings/components/AccountDeletionButton
 */

import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { XStack, YStack, Text as TamaguiText, Button as TamaguiButton, styled } from 'tamagui';
import { useTranslation } from '@/i18n';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { useDeleteAccount } from '../hooks/useDeleteAccount';
import { useRouter } from 'expo-router';
import { signOut } from '@/lib/auth';
import { useTenantContext } from '@/hooks/useTenantContext';

// ============================================================================
// TYPES
// ============================================================================

export interface AccountDeletionButtonProps {
  /**
   * Test ID for E2E testing.
   */
  testID?: string;
}

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const DangerZoneContainer = styled(YStack, {
  name: 'DangerZone',
  backgroundColor: '$error',
  backgroundColorOpacity: 0.05,
  borderWidth: 1,
  borderColor: '$error',
  borderColorOpacity: 0.3,
  borderRadius: '$4',
  padding: '$4',
  gap: '$3',
  marginVertical: '$4',
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AccountDeletionButton({ testID = 'account-deletion' }: AccountDeletionButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearTenantContext } = useTenantContext();

  const [showDialog, setShowDialog] = useState(false);

  const { deleting, error, deleteAccount } = useDeleteAccount();

  const handleDeletePress = () => {
    setShowDialog(true);
  };

  const handleConfirmDelete = async () => {
    const response = await deleteAccount();

    setShowDialog(false);

    if (response?.success) {
      // Clear auth session and tenant context
      await clearTenantContext();
      await signOut();
      router.replace('/(auth)/login');
    }
  };

  const handleCancelDelete = () => {
    setShowDialog(false);
  };

  return (
    <DangerZoneContainer testID={testID}>
      <TamaguiText
        testID={`${testID}-label`}
        fontSize="$sm"
        fontWeight="700"
        color="$error"
        textTransform="uppercase"
        letterSpacing={0.5}
      >
        {t('settings.danger_zone')}
      </TamaguiText>

      <XStack justifyContent="space-between" alignItems="center">
        <YStack flex={1} gap="$1">
          <TamaguiText testID={`${testID}-title`} fontSize="$md" fontWeight="600" color="$color">
            {t('settings.delete_account')}
          </TamaguiText>
          <TamaguiText fontSize="$sm" color="$color3">
            {t('settings.delete_account_warning')}
          </TamaguiText>
        </YStack>

        <TamaguiButton
          testID={`${testID}-button`}
          backgroundColor="$error"
          color="white"
          size="$3"
          onPress={handleDeletePress}
          disabled={deleting}
          opacity={deleting ? 0.7 : 1}
          pressStyle={{ opacity: deleting ? 0.7 : 0.8 }}
        >
          {deleting ? (
            <XStack alignItems="center" gap="$2">
              <ActivityIndicator size="small" color="white" />
              <TamaguiText color="white">{t('settings.deleting_account')}</TamaguiText>
            </XStack>
          ) : (
            <TamaguiText color="white" fontWeight="600">
              {t('settings.delete_account')}
            </TamaguiText>
          )}
        </TamaguiButton>
      </XStack>

      {/* Deletion Error */}
      {error && (
        <TamaguiText testID={`${testID}-error`} fontSize="$xs" color="$danger">
          {error.message}
        </TamaguiText>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        visible={showDialog}
        titleKey="settings.delete_account_confirm_title"
        messageKey="settings.delete_account_confirm_message"
        confirmTextKey="settings.delete_account"
        cancelTextKey="settings.cancel"
        testID={`${testID}-confirm-dialog`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={deleting}
        confirmDisabled={deleting}
        variant="danger"
      />
    </DangerZoneContainer>
  );
}

AccountDeletionButton.displayName = 'AccountDeletionButton';
