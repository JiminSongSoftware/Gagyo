/**
 * Hook for uploading profile photos.
 *
 * Handles image selection, upload to Supabase storage, and updating
 * the user's photo_url in the database.
 *
 * @module features/settings/hooks/useUploadProfilePhoto
 */

import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

/**
 * Return type for useUploadProfilePhoto hook.
 */
export interface UseUploadProfilePhotoReturn {
  /** Upload progress from 0 to 1 */
  progress: number;
  /** Whether the upload is in progress */
  uploading: boolean;
  /** Error from the last upload attempt, if any */
  error: Error | null;
  /** Upload a profile photo from the device */
  uploadProfilePhoto: () => Promise<string | null>;
  /** Delete the current profile photo */
  deleteProfilePhoto: () => Promise<boolean>;
}

const STORAGE_BUCKET_NAME = 'profile-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Hook for uploading profile photos to Supabase storage.
 *
 * Launches the image picker, uploads the selected file to the profile-photos
 * bucket, and updates the user's photo_url. Returns the public URL of the
 * uploaded photo.
 *
 * @example
 * ```tsx
 * function ProfilePhotoSection() {
 *   const { progress, uploading, error, uploadProfilePhoto, deleteProfilePhoto } =
 *     useUploadProfilePhoto();
 *
 *   const handleUpload = async () => {
 *     const photoUrl = await uploadProfilePhoto();
 *     if (photoUrl) {
 *       // Show success, update UI with new photo
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <Button onPress={handleUpload} disabled={uploading} />
 *       {uploading && <ProgressBar progress={progress} />}
 *       {error && <ErrorMessage>{error.message}</ErrorMessage>}
 *     </>
 *   );
 * }
 * ```
 */
export function useUploadProfilePhoto(): UseUploadProfilePhotoReturn {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadProfilePhoto = useCallback(async (): Promise<string | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      const userId = user.id;

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        throw new Error('No image URI provided');
      }

      // Validate file size
      const fileInfo = await fetch(asset.uri).then((r) => r.blob());
      if (fileInfo.size > MAX_FILE_SIZE) {
        throw new Error('Image size must be less than 5 MB');
      }

      // Determine MIME type
      const mimeType = asset.mimeType || 'image/jpeg';
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw new Error('Only JPEG, PNG, and WebP images are allowed');
      }

      // Read file as array buffer
      const fileBuffer = await fetch(asset.uri).then((r) => r.arrayBuffer());

      // Generate unique filename
      const fileExt = mimeType.split('/')[1];
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase storage with progress tracking
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .upload(fileName, fileBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      setProgress(1);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update user's photo_url in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ photo_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      return publicUrl;
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error('Failed to upload photo');
      setError(errorObj);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteProfilePhoto = useCallback(async (): Promise<boolean> => {
    setUploading(true);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      const userId = user.id;

      // List all files in the user's profile photo folder
      const { data: files, error: listError } = await supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .list(`${userId}/`, {
          limit: 100,
        });

      if (listError) {
        // Bucket might not exist or user has no photos
        return true;
      }

      // Delete each file
      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${userId}/${f.name}`);

        const { error: deleteError } = await supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .remove(filePaths);

        if (deleteError) {
          throw deleteError;
        }
      }

      // Update user's photo_url to null in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ photo_url: null })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error('Failed to delete photo');
      setError(errorObj);
      return false;
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    progress,
    uploading,
    error,
    uploadProfilePhoto,
    deleteProfilePhoto,
  };
}
