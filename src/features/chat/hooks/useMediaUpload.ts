/**
 * Hook for uploading media in chat.
 *
 * Provides functions to upload photos, videos, files, and camera captures.
 * Handles validation, error states, and cleanup.
 */

import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import type { MessageWithSender, MessageContentType } from '@/types/database';

// Allowed MIME types for different content types
const _ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
const _ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime'] as const;
const _ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
] as const;

type _AllowedMimeType =
  | (typeof _ALLOWED_IMAGE_TYPES)[number]
  | (typeof _ALLOWED_VIDEO_TYPES)[number]
  | (typeof _ALLOWED_FILE_TYPES)[number];

/**
 * State returned by useMediaUpload hook
 */
export interface MediaUploadState {
  /** Pick and upload a photo from library */
  pickAndUploadPhoto: () => Promise<MessageWithSender | null>;
  /** Pick and upload a video from library */
  pickAndUploadVideo: () => Promise<MessageWithSender | null>;
  /** Pick and upload a file */
  pickAndUploadFile: () => Promise<MessageWithSender | null>;
  /** Open camera and upload captured photo/video */
  openCamera: () => Promise<MessageWithSender | null>;
  /** Whether an upload is in progress */
  uploading: boolean;
  /** Error from the last upload attempt */
  error: Error | null;
  /** Clear the current error */
  clearError: () => void;
}

/**
 * Options for the photo picker
 */
const PHOTO_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8,
};

/**
 * Options for the video picker
 */
const VIDEO_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'videos',
  quality: 0.8,
};

/**
 * Options for the camera
 */
const CAMERA_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images', 'videos'] as unknown as 'images',
  cameraType: ImagePicker.CameraType.back,
  quality: 0.8,
  allowsEditing: true,
};

/**
 * Get storage bucket path based on content type
 */
function getStoragePath(contentType: MessageContentType): string {
  switch (contentType) {
    case 'image':
      return 'chat-images';
    case 'video':
      return 'chat-videos';
    case 'file':
      return 'chat-files';
    default:
      return 'chat-files';
  }
}

/**
 * Generate a unique file path for storage
 */
function generateStoragePath(
  tenantId: string,
  conversationId: string,
  messageId: string,
  fileName: string,
  _contentType: MessageContentType
): string {
  const timestamp = Date.now();
  const extension = fileName.split('.').pop() || 'bin';
  return `${tenantId}/${conversationId}/${messageId}_${timestamp}.${extension}`;
}

/**
 * Validate file size (max 25MB for videos, 10MB for files, 5MB for images)
 */
function validateFileSize(
  size: number,
  contentType: MessageContentType
): { valid: boolean; error?: Error } {
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  let maxSize: number;
  switch (contentType) {
    case 'image':
      maxSize = MAX_IMAGE_SIZE;
      break;
    case 'video':
      maxSize = MAX_VIDEO_SIZE;
      break;
    case 'file':
      maxSize = MAX_FILE_SIZE;
      break;
    default:
      maxSize = MAX_FILE_SIZE;
  }

  if (size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: new Error(`File too large. Maximum size is ${maxSizeMB}MB.`),
    };
  }

  return { valid: true };
}

/**
 * Convert a file URI to a Uint8Array for upload.
 * Uses expo-file-system to read the actual file data.
 */
async function uriToUint8Array(uri: string): Promise<Uint8Array> {
  // Read the file as base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });

  // Convert base64 to binary string
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Upload a file to Supabase storage
 */
async function uploadFileToStorage(
  tenantId: string,
  conversationId: string,
  messageId: string,
  fileUri: string,
  fileName: string,
  mimeType: string,
  contentType: MessageContentType
): Promise<{ url: string; attachmentId: string }> {
  const storagePath = generateStoragePath(
    tenantId,
    conversationId,
    messageId,
    fileName,
    contentType
  );

  console.log('[uploadFileToStorage] Reading file from URI:', fileUri.substring(0, 50) + '...');

  // Convert URI to Uint8Array using expo-file-system
  const fileData = await uriToUint8Array(fileUri);

  console.log('[uploadFileToStorage] File size:', fileData.length, 'bytes');

  // Upload to Supabase storage (accepts Uint8Array as ArrayBufferView)
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(getStoragePath(contentType))
    .upload(storagePath, fileData, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error('[uploadFileToStorage] Upload error:', uploadError);
    throw uploadError;
  }

  console.log('[uploadFileToStorage] Upload successful:', uploadData.path);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(getStoragePath(contentType))
    .getPublicUrl(uploadData.path);

  console.log('[uploadFileToStorage] Public URL:', urlData.publicUrl);

  // Create attachment record
  const { data: attachmentData, error: attachmentError } = await supabase
    .from('attachments')
    .insert({
      tenant_id: tenantId,
      message_id: messageId,
      file_name: fileName,
      url: urlData.publicUrl,
      file_size: fileData.length,
      file_type: mimeType,
    })
    .select('id')
    .single<{ id: string }>();

  if (attachmentError) {
    console.error('[uploadFileToStorage] Attachment insert error:', attachmentError);
    throw attachmentError;
  }

  return {
    url: urlData.publicUrl,
    attachmentId: attachmentData?.id ?? '',
  };
}

/**
 * Create a message with media content type
 */
async function createMediaMessage(
  conversationId: string,
  tenantId: string,
  senderMembershipId: string,
  contentUrl: string,
  contentType: MessageContentType,
  fileName?: string
): Promise<MessageWithSender | null> {
  const { data, error: insertError } = await supabase
    .from('messages')
    .insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      sender_id: senderMembershipId,
      content: fileName ? `${fileName}|${contentUrl}` : contentUrl,
      content_type: contentType,
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
}

/**
 * Hook for uploading media in a conversation.
 *
 * @param conversationId - The conversation ID to send the media to
 * @param tenantId - The tenant ID for the message
 * @param senderMembershipId - The sender's membership ID
 * @returns MediaUploadState with upload functions and state
 */
export function useMediaUpload(
  conversationId: string | null,
  tenantId: string | null,
  senderMembershipId: string | null
): MediaUploadState {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validateParams = useCallback((): boolean => {
    console.log('useMediaUpload validateParams:', { conversationId, tenantId, senderMembershipId });
    if (!conversationId || !tenantId || !senderMembershipId) {
      console.error('Missing required parameters:', {
        hasConversationId: !!conversationId,
        hasTenantId: !!tenantId,
        hasSenderMembershipId: !!senderMembershipId,
      });
      setError(new Error('Missing required parameters'));
      return false;
    }
    return true;
  }, [conversationId, tenantId, senderMembershipId]);

  /**
   * Pick and upload a photo from library
   */
  const pickAndUploadPhoto = useCallback(async (): Promise<MessageWithSender | null> => {
    console.log('[pickAndUploadPhoto] Starting...');
    if (!validateParams()) {
      console.log('[pickAndUploadPhoto] Validation failed');
      return null;
    }

    setUploading(true);
    setError(null);

    try {
      // Request permission
      console.log('[pickAndUploadPhoto] Requesting permission...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[pickAndUploadPhoto] Permission status:', status);
      if (status !== 'granted') {
        setError(new Error('Permission to access media library was denied'));
        return null;
      }

      // Launch photo picker
      console.log('[pickAndUploadPhoto] Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync(PHOTO_PICKER_OPTIONS);
      console.log('[pickAndUploadPhoto] Picker result:', {
        canceled: result.canceled,
        hasAssets: !!result.assets?.length,
      });

      if (result.canceled || !result.assets?.[0]) {
        console.log('[pickAndUploadPhoto] User canceled or no asset');
        return null;
      }

      const asset = result.assets[0];
      const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? 'image/jpeg';

      console.log('[pickAndUploadPhoto] Asset selected:', {
        fileName,
        mimeType,
        uri: asset.uri.substring(0, 50) + '...',
      });

      // Validate file size
      const fileSize = asset.fileSize ?? 0;
      const sizeValidation = validateFileSize(fileSize, 'image');
      if (!sizeValidation.valid) {
        setError(sizeValidation.error!);
        return null;
      }

      // Upload and create message
      console.log('[pickAndUploadPhoto] Creating message first...');
      // Create message first to get a real UUID for the attachment
      const tempUrl = `temp://${fileName}`;
      const message = await createMediaMessage(
        conversationId!,
        tenantId!,
        senderMembershipId!,
        tempUrl,
        'image',
        fileName
      );
      console.log('[pickAndUploadPhoto] Message created:', message?.id);

      if (!message) {
        throw new Error('Failed to create message');
      }

      console.log('[pickAndUploadPhoto] Starting file upload...');
      // Upload file with real message ID
      const uploadResult = await uploadFileToStorage(
        tenantId!,
        conversationId!,
        message.id, // Use real message ID now
        asset.uri,
        fileName,
        mimeType,
        'image'
      );
      console.log('[pickAndUploadPhoto] Upload complete:', uploadResult.url);

      // Update message content with actual file URL
      const { error: updateError, data: updatedMessage } = await supabase
        .from('messages')
        .update({ content: `${fileName}|${uploadResult.url}` })
        .eq('id', message.id)
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

      if (updateError) {
        console.error('[pickAndUploadPhoto] Failed to update message URL:', updateError);
      }

      // Return the updated message with the correct URL
      if (updatedMessage) {
        const sender = updatedMessage.sender as {
          id: string;
          user: {
            id: string;
            display_name: string | null;
            photo_url: string | null;
          };
        };
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        return {
          id: updatedMessage.id,
          tenant_id: updatedMessage.tenant_id,
          conversation_id: updatedMessage.conversation_id,
          sender_id: updatedMessage.sender_id,
          parent_id: updatedMessage.parent_id,
          content: updatedMessage.content,
          content_type: updatedMessage.content_type as MessageContentType,
          is_event_chat: updatedMessage.is_event_chat,
          created_at: updatedMessage.created_at,
          updated_at: updatedMessage.updated_at,
          deleted_at: updatedMessage.deleted_at,
          // Flatten user data into sender object to match MessageWithSender type
          sender: {
            id: sender?.id ?? '',
            display_name: sender?.user?.display_name ?? null,
            photo_url: sender?.user?.photo_url ?? null,
          },
        } as MessageWithSender;
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      }

      return message;
    } catch (err) {
      console.error('[pickAndUploadPhoto] Error:', err);
      const uploadError = new Error(err instanceof Error ? err.message : 'Failed to upload photo');
      setError(uploadError);
      return null;
    } finally {
      setUploading(false);
    }
  }, [conversationId, tenantId, senderMembershipId, validateParams]);

  /**
   * Pick and upload a video from library
   */
  const pickAndUploadVideo = useCallback(async (): Promise<MessageWithSender | null> => {
    if (!validateParams()) return null;

    setUploading(true);
    setError(null);

    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError(new Error('Permission to access media library was denied'));
        return null;
      }

      // Launch video picker
      const result = await ImagePicker.launchImageLibraryAsync(VIDEO_PICKER_OPTIONS);

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      const asset = result.assets[0];
      const fileName = asset.fileName ?? `video_${Date.now()}.mp4`;
      const mimeType = asset.mimeType ?? 'video/mp4';

      // Validate file size
      const fileSize = asset.fileSize ?? 0;
      const sizeValidation = validateFileSize(fileSize, 'video');
      if (!sizeValidation.valid) {
        setError(sizeValidation.error!);
        return null;
      }

      // Create message first to get a real UUID
      const tempUrl = `temp://${fileName}`;
      const message = await createMediaMessage(
        conversationId!,
        tenantId!,
        senderMembershipId!,
        tempUrl,
        'video',
        fileName
      );

      if (!message) {
        throw new Error('Failed to create message');
      }

      // Upload file with real message ID
      const uploadResult = await uploadFileToStorage(
        tenantId!,
        conversationId!,
        message.id,
        asset.uri,
        fileName,
        mimeType,
        'video'
      );

      // Update message content with actual file URL
      await supabase
        .from('messages')
        .update({ content: `${fileName}|${uploadResult.url}` })
        .eq('id', message.id);

      return message;
    } catch (err) {
      const uploadError = new Error(err instanceof Error ? err.message : 'Failed to upload video');
      setError(uploadError);
      return null;
    } finally {
      setUploading(false);
    }
  }, [conversationId, tenantId, senderMembershipId, validateParams]);

  /**
   * Pick and upload a file
   */
  const pickAndUploadFile = useCallback(async (): Promise<MessageWithSender | null> => {
    if (!validateParams()) return null;

    setUploading(true);
    setError(null);

    try {
      // Launch document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      const asset = result.assets[0];
      const fileName = asset.name;
      const mimeType = asset.mimeType ?? 'application/octet-stream';

      // Validate file size
      const sizeValidation = validateFileSize(asset.size ?? 0, 'file');
      if (!sizeValidation.valid) {
        setError(sizeValidation.error!);
        return null;
      }

      // Create message first to get a real UUID
      const tempUrl = `temp://${fileName}`;
      const message = await createMediaMessage(
        conversationId!,
        tenantId!,
        senderMembershipId!,
        tempUrl,
        'file',
        fileName
      );

      if (!message) {
        throw new Error('Failed to create message');
      }

      // Upload file with real message ID
      const uploadResult = await uploadFileToStorage(
        tenantId!,
        conversationId!,
        message.id,
        asset.uri,
        fileName,
        mimeType,
        'file'
      );

      // Update message content with actual file URL
      await supabase
        .from('messages')
        .update({ content: `${fileName}|${uploadResult.url}` })
        .eq('id', message.id);

      return message;
    } catch (err) {
      const uploadError = new Error(err instanceof Error ? err.message : 'Failed to upload file');
      setError(uploadError);
      return null;
    } finally {
      setUploading(false);
    }
  }, [conversationId, tenantId, senderMembershipId, validateParams]);

  /**
   * Open camera and upload captured photo/video
   */
  const openCamera = useCallback(async (): Promise<MessageWithSender | null> => {
    if (!validateParams()) return null;

    setUploading(true);
    setError(null);

    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError(new Error('Permission to access camera was denied'));
        return null;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync(CAMERA_OPTIONS);

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      const asset = result.assets[0];

      // Determine content type based on asset
      const isVideo = asset.type === 'video';
      const contentType: MessageContentType = isVideo ? 'video' : 'image';
      const defaultExtension = isVideo ? 'mp4' : 'jpg';
      const fileName = asset.fileName ?? `camera_${Date.now()}.${defaultExtension}`;
      const defaultMimeType = isVideo ? 'video/mp4' : 'image/jpeg';
      const mimeType = asset.mimeType ?? defaultMimeType;

      // Validate file size
      const fileSize = asset.fileSize ?? 0;
      const sizeValidation = validateFileSize(fileSize, contentType);
      if (!sizeValidation.valid) {
        setError(sizeValidation.error!);
        return null;
      }

      // Create message first to get a real UUID
      const tempUrl = `temp://${fileName}`;
      const message = await createMediaMessage(
        conversationId!,
        tenantId!,
        senderMembershipId!,
        tempUrl,
        contentType,
        fileName
      );

      if (!message) {
        throw new Error('Failed to create message');
      }

      // Upload file with real message ID
      const uploadResult = await uploadFileToStorage(
        tenantId!,
        conversationId!,
        message.id,
        asset.uri,
        fileName,
        mimeType,
        contentType
      );

      // Update message content with actual file URL
      await supabase
        .from('messages')
        .update({ content: `${fileName}|${uploadResult.url}` })
        .eq('id', message.id);

      return message;
    } catch (err) {
      const uploadError = new Error(
        err instanceof Error ? err.message : 'Failed to capture from camera'
      );
      setError(uploadError);
      return null;
    } finally {
      setUploading(false);
    }
  }, [conversationId, tenantId, senderMembershipId, validateParams]);

  return {
    pickAndUploadPhoto,
    pickAndUploadVideo,
    pickAndUploadFile,
    openCamera,
    uploading,
    error,
    clearError,
  };
}
