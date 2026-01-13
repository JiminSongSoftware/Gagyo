/**
 * Hook for uploading images in chat.
 *
 * Provides a function to upload images, create messages with image content,
 * and track upload progress. Handles validation, error states, and cleanup.
 *
 * See: claude_docs/17_images_view.md for architecture documentation
 */

import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import {
  uploadImage,
  validateImage,
  getMimeTypeFromExtension,
  ImageUploadError,
  ALLOWED_MIME_TYPES,
  type AllowedMimeType,
} from '@/lib/imageUpload';
import type { MessageWithSender, MessageContentType } from '@/types/database';

/**
 * State returned by useImageUpload hook
 */
export interface ImageUploadState {
  /** Pick an image from library and upload it */
  pickAndUploadImage: () => Promise<MessageWithSender | null>;
  /** Upload an already selected image */
  uploadSelectedImage: (
    imageUri: string,
    fileName: string,
    mimeType: AllowedMimeType
  ) => Promise<MessageWithSender | null>;
  /** Whether an upload is in progress */
  uploading: boolean;
  /** Current upload progress (0-1) */
  progress: number;
  /** Error from the last upload attempt */
  error: Error | null;
  /** Clear the current error */
  clearError: () => void;
}

/**
 * Options for the image picker
 */
const IMAGE_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8, // Compress to reduce file size
};

/**
 * Hook for uploading images in a conversation.
 *
 * @param conversationId - The conversation ID to send the image to
 * @param tenantId - The tenant ID for the message
 * @param senderMembershipId - The sender's membership ID
 * @returns ImageUploadState with upload functions and state
 *
 * @example
 * ```tsx
 * function MessageInput() {
 *   const { pickAndUploadImage, uploading, progress, error, clearError } = useImageUpload(
 *     conversationId,
 *     tenantId,
 *     membershipId
 *   );
 *
 *   const handleImagePick = async () => {
 *     const message = await pickAndUploadImage();
 *     if (message) {
 *       console.log('Image sent:', message.content);
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handleImagePick} disabled={uploading}>
 *         {uploading ? `Uploading ${Math.round(progress * 100)}%` : 'Add Image'}
 *       </Button>
 *       {error && (
 *         <View>
 *           <Text>{error.message}</Text>
 *           <Button onPress={clearError}>Dismiss</Button>
 *         </View>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useImageUpload(
  conversationId: string | null,
  tenantId: string | null,
  senderMembershipId: string | null
): ImageUploadState {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Create a message with image content type
   */
  const createImageMessage = useCallback(
    async (imageUrl: string): Promise<MessageWithSender | null> => {
      if (!conversationId || !tenantId || !senderMembershipId) {
        throw new Error('Missing required parameters');
      }

      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({
          tenant_id: tenantId,
          conversation_id: conversationId,
          sender_id: senderMembershipId,
          content: imageUrl,
          content_type: 'image' as MessageContentType,
        })
        .select(
          `
          id,
          tenant_id,
          conversation_id,
          sender_id,
          parent_id,
          content,
          content_type,
          is_event_chat,
          created_at,
          updated_at,
          deleted_at,
          sender:memberships!messages_sender_id_fkey (
            id,
            user:users!memberships_user_id_fkey (
              id,
              display_name,
              photo_url
            )
          )
        `
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update conversation updated_at to move it to top of list
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (data) {
        const sender = data.sender as {
          id: string;
          user: {
            id: string;
            display_name: string | null;
            photo_url: string | null;
          };
        };

        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        return {
          id: data.id,
          tenant_id: data.tenant_id,
          conversation_id: data.conversation_id,
          sender_id: data.sender_id,
          parent_id: data.parent_id,
          content: data.content,
          content_type: data.content_type as MessageContentType,
          is_event_chat: data.is_event_chat,
          created_at: data.created_at,
          updated_at: data.updated_at,
          deleted_at: data.deleted_at,
          // Flatten user data into sender object to match MessageWithSender type
          sender: {
            id: sender?.id ?? '',
            display_name: sender?.user?.display_name ?? null,
            photo_url: sender?.user?.photo_url ?? null,
          },
        } as MessageWithSender;
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      }

      return null;
    },
    [conversationId, tenantId, senderMembershipId]
  );

  /**
   * Upload an already selected image
   */
  const uploadSelectedImage = useCallback(
    async (
      imageUri: string,
      fileName: string,
      mimeType: AllowedMimeType
    ): Promise<MessageWithSender | null> => {
      if (!conversationId || !tenantId || !senderMembershipId) {
        setError(new Error('Missing required parameters'));
        return null;
      }

      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Validate image
        setProgress(0.1);
        const validation = await validateImage(imageUri, mimeType);
        if (!validation.valid) {
          throw validation.error;
        }

        // Create a placeholder message ID (we'll update it after actual message creation)
        const tempMessageId = crypto.randomUUID();
        setProgress(0.2);

        // Upload image to storage
        const uploadResult = await uploadImage({
          tenantId,
          messageId: tempMessageId,
          imageUri,
          fileName,
          mimeType,
        });
        setProgress(0.7);

        // Create message with image URL
        const message = await createImageMessage(uploadResult.url);
        setProgress(0.9);

        // Update attachment to link to actual message ID
        if (message) {
          await supabase
            .from('attachments')
            .update({ message_id: message.id })
            .eq('id', uploadResult.attachmentId);
        }

        setProgress(1);
        return message;
      } catch (err) {
        const uploadError =
          err instanceof ImageUploadError
            ? err
            : new Error(err instanceof Error ? err.message : 'Failed to upload image');
        setError(uploadError);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [conversationId, tenantId, senderMembershipId, createImageMessage]
  );

  /**
   * Open image picker and upload selected image
   */
  const pickAndUploadImage = useCallback(async (): Promise<MessageWithSender | null> => {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
    if (!conversationId || !tenantId || !senderMembershipId) {
      setError(new Error('Missing required parameters'));
      return null;
    }

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError(new Error('Permission to access media library was denied'));
      return null;
    }

    // Launch image picker
    const result = (await ImagePicker.launchImageLibraryAsync(
      IMAGE_PICKER_OPTIONS
    )) as ImagePicker.ImagePickerResult;

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    const asset = result.assets[0] as ImagePicker.ImagePickerAsset;
    const fileName = asset.fileName ?? `image_${Date.now()}.jpg`;

    // Determine MIME type
    let mimeType: AllowedMimeType;
    if (asset.mimeType && ALLOWED_MIME_TYPES.includes(asset.mimeType as AllowedMimeType)) {
      mimeType = asset.mimeType as AllowedMimeType;
    } else {
      const detectedMimeType = getMimeTypeFromExtension(fileName);
      if (!detectedMimeType) {
        setError(
          new ImageUploadError(
            'Invalid image format. Supported formats: JPEG, PNG, GIF, WebP',
            'INVALID_MIME_TYPE'
          )
        );
        return null;
      }
      mimeType = detectedMimeType;
    }

    return uploadSelectedImage(asset.uri, fileName, mimeType);
    /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
  }, [conversationId, tenantId, senderMembershipId, uploadSelectedImage]);

  return {
    pickAndUploadImage,
    uploadSelectedImage,
    uploading,
    progress,
    error,
    clearError,
  };
}
