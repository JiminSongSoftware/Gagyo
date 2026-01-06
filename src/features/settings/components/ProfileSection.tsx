/**
 * Profile Section Component
 *
 * Displays and edits user profile information including:
 * - Profile photo with upload/remove functionality
 * - Display name (editable)
 * - Email (read-only, with verification status)
 *
 * Features:
 * - testID for E2E testing
 * - i18n support
 * - Accessible with proper labels
 *
 * @module features/settings/components/ProfileSection
 */

import { useState } from 'react';
import { Image, Pressable, ActivityIndicator } from 'react-native';
import {
  XStack,
  YStack,
  Text as TamaguiText,
  styled,
  useTheme,
} from 'tamagui';
import { useTranslation } from '@/i18n';
import { useUploadProfilePhoto } from '../hooks/useUploadProfilePhoto';
import type { NotificationPreferences } from '../hooks/useUpdateProfile';

// ============================================================================
// TYPES
// ============================================================================

export interface ProfileSectionProps {
  /**
   * Current display name.
   */
  displayName: string | null;

  /**
   * Current profile photo URL.
   */
  photoUrl: string | null;

  /**
   * User's email address.
   */
  email: string;

  /**
   * Whether the email is verified.
   */
  emailVerified: boolean;

  /**
   * Callback when display name changes.
   */
  onDisplayNameChange: (name: string) => void;

  /**
   * Callback when profile photo is uploaded.
   */
  onPhotoUploaded: (url: string) => void;

  /**
   * Callback when profile photo is removed.
   */
  onPhotoRemoved: () => void;

  /**
   * Test ID for E2E testing.
   */
  testID?: string;
}

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const PhotoContainer = styled(Pressable, {
  name: 'ProfilePhotoContainer',
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: '$backgroundTertiary',
  borderWidth: 2,
  borderColor: '$borderLight',
  overflow: 'hidden',
  position: 'relative',
});

const PhotoOverlay = styled(Pressable, {
  name: 'ProfilePhotoOverlay',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0,
});

const DisplayNameInput = styled(TamaguiText, {
  name: 'DisplayNameInput',
  fontSize: '$xl',
  fontWeight: '700',
  color: '$color',
  padding: '$2',
  borderBottomWidth: 1,
  borderBottomColor: '$borderLight',
  minWidth: 150,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProfileSection({
  displayName,
  photoUrl,
  email,
  emailVerified,
  onDisplayNameChange,
  onPhotoUploaded,
  onPhotoRemoved,
  testID = 'profile-section',
}: ProfileSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName || '');

  const { uploading, progress, error: uploadError, uploadProfilePhoto, deleteProfilePhoto } =
    useUploadProfilePhoto();

  const handlePhotoUpload = async () => {
    const url = await uploadProfilePhoto();
    if (url) {
      onPhotoUploaded(url);
    }
  };

  const handlePhotoRemove = async () => {
    const success = await deleteProfilePhoto();
    if (success) {
      onPhotoRemoved();
    }
  };

  const handleEditPress = () => {
    setIsEditing(true);
    setEditValue(displayName || '');
  };

  const handleEditSave = () => {
    setIsEditing(false);
    onDisplayNameChange(editValue.trim());
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditValue(displayName || '');
  };

  return (
    <YStack testID={testID} gap="$4" alignItems="center" padding="$4" backgroundColor="$backgroundSecondary" borderRadius="$4">
      {/* Profile Photo */}
      <XStack position="relative">
        <PhotoContainer
          testID={`${testID}-photo`}
          onPress={handlePhotoUpload}
          accessibilityLabel={t('settings.change_avatar')}
          accessibilityRole="button"
        >
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={{ width: '100%', height: '100%' }}
              testID={`${testID}-photo-image`}
            />
          ) : (
            <TamaguiText
              fontSize="$6xl"
              color="$color3"
              style={{ lineHeight: 80 }}
              testID={`${testID}-photo-placeholder`}
            >
              👤
            </TamaguiText>
          )}

          {uploading && (
            <YStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              alignItems="center"
              justifyContent="center"
              backgroundColor="rgba(0, 0, 0, 0.5)"
              testID={`${testID}-photo-uploading`}
            >
              <ActivityIndicator size="small" color={theme.color4?.val} />
            </YStack>
          )}
        </PhotoContainer>

        {/* Upload/Remove Buttons */}
        {photoUrl ? (
          <Pressable
            testID={`${testID}-remove-photo`}
            onPress={handlePhotoRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ position: 'absolute', right: -5, bottom: 0 }}
            accessibilityLabel={t('settings.remove_photo')}
          >
            <YStack
              backgroundColor="$error"
              width={28}
              height={28}
              borderRadius={14}
              alignItems="center"
              justifyContent="center"
              borderWidth={2}
              borderColor="$background"
            >
              <TamaguiText color="white" fontSize="$xs" fontWeight="bold">
                ×
              </TamaguiText>
            </YStack>
          </Pressable>
        ) : (
          <Pressable
            testID={`${testID}-upload-photo`}
            onPress={handlePhotoUpload}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ position: 'absolute', right: -5, bottom: 0 }}
            accessibilityLabel={t('settings.upload_photo')}
          >
            <YStack
              backgroundColor="$primary"
              width={28}
              height={28}
              borderRadius={14}
              alignItems="center"
              justifyContent="center"
              borderWidth={2}
              borderColor="$background"
            >
              <TamaguiText color="white" fontSize="$xs" fontWeight="bold">
                +
              </TamaguiText>
            </YStack>
          </Pressable>
        )}
      </XStack>

      {/* Display Name */}
      {isEditing ? (
        <XStack alignItems="center" gap="$2">
          <TamaguiText
            testID={`${testID}-display-name-input`}
            fontSize="$xl"
            fontWeight="700"
            color="$color"
            padding="$2"
            borderWidth={1}
            borderColor="$borderLight"
            borderRadius="$2"
            minWidth={150}
            value={editValue}
            onChangeText={setEditValue}
            autoFocus
            onSubmitEditing={handleEditSave}
          >
            {editValue}
          </TamaguiText>
          <TamaguiText
            testID={`${testID}-save-name`}
            color="$primary"
            fontSize="$sm"
            onPress={handleEditSave}
          >
            {t('settings.save')}
          </TamaguiText>
          <TamaguiText
            testID={`${testID}-cancel-name`}
            color="$color3"
            fontSize="$sm"
            onPress={handleEditCancel}
          >
            {t('settings.cancel')}
          </TamaguiText>
        </XStack>
      ) : (
        <Pressable
          testID={`${testID}-display-name`}
          onPress={handleEditPress}
          accessibilityLabel={`${t('settings.display_name')}: ${displayName || t('settings.edit_profile')}`}
          accessibilityRole="button"
        >
          <TamaguiText
            fontSize="$xl"
            fontWeight="700"
            color="$color"
          >
            {displayName || t('settings.edit_profile')}
          </TamaguiText>
        </Pressable>
      )}

      {/* Email */}
      <XStack alignItems="center" gap="$2">
        <TamaguiText
          testID={`${testID}-email`}
          fontSize="$sm"
          color="$color3"
        >
          {email}
        </TamaguiText>
        <TamaguiText
          testID={`${testID}-email-verified`}
          fontSize="$xs"
          color={emailVerified ? '$success' : '$warning'}
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$2"
          backgroundColor={emailVerified ? '$success' : '$warning'}
          backgroundColorOpacity={0.1}
        >
          {emailVerified ? t('settings.email_verified') : t('settings.email_unverified')}
        </TamaguiText>
      </XStack>

      {/* Upload Error */}
      {uploadError && (
        <TamaguiText testID={`${testID}-upload-error`} fontSize="$xs" color="$danger">
          {t('settings.photo_upload_failed')}
        </TamaguiText>
      )}
    </YStack>
  );
}

ProfileSection.displayName = 'ProfileSection';
