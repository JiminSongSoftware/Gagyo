/**
 * Settings hooks exports.
 *
 * Provides hooks for profile management, photo uploads, and account deletion.
 */

export { useUpdateProfile } from './useUpdateProfile';
export type {
  UpdateProfileParams,
  UseUpdateProfileReturn,
  NotificationPreferences,
} from './useUpdateProfile';

export { useUploadProfilePhoto } from './useUploadProfilePhoto';
export type {
  UseUploadProfilePhotoReturn,
} from './useUploadProfilePhoto';

export { useDeleteAccount } from './useDeleteAccount';
export type {
  UseDeleteAccountReturn,
  DeleteAccountResponse,
} from './useDeleteAccount';
