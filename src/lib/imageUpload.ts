/**
 * Image Upload Utility
 *
 * Handles uploading images to Supabase Storage and creating attachment records.
 * Enforces file size limits, MIME type validation, and tenant isolation.
 *
 * See: claude_docs/17_images_view.md for architecture documentation
 */

import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

/**
 * Maximum file size in bytes (5 MiB)
 */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed image MIME types
 */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Error types for image upload
 */
export class ImageUploadError extends Error {
  constructor(
    message: string,
    public code:
      | 'FILE_TOO_LARGE'
      | 'INVALID_MIME_TYPE'
      | 'UPLOAD_FAILED'
      | 'ATTACHMENT_FAILED'
      | 'FILE_READ_FAILED'
  ) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

/**
 * Result of a successful image upload
 */
export interface ImageUploadResult {
  /** Public URL of the uploaded image */
  url: string;
  /** ID of the created attachment record */
  attachmentId: string;
  /** Storage path of the uploaded file */
  storagePath: string;
}

/**
 * Options for image upload
 */
export interface ImageUploadOptions {
  /** Tenant ID for storage folder path */
  tenantId: string;
  /** Message ID for storage folder path */
  messageId: string;
  /** Local image URI (from ImagePicker) */
  imageUri: string;
  /** Original file name */
  fileName: string;
  /** MIME type of the image */
  mimeType: AllowedMimeType;
}

/**
 * Get file info for validation
 */
async function getFileInfo(uri: string): Promise<{ size: number; exists: boolean }> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return {
      exists: info.exists,
      size: info.exists && 'size' in info ? (info.size ?? 0) : 0,
    };
  } catch {
    return { exists: false, size: 0 };
  }
}

/**
 * Validate image before upload
 */
export async function validateImage(
  uri: string,
  mimeType: string
): Promise<{ valid: true } | { valid: false; error: ImageUploadError }> {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return {
      valid: false,
      error: new ImageUploadError(
        `Invalid image format. Allowed formats: ${ALLOWED_MIME_TYPES.join(', ')}`,
        'INVALID_MIME_TYPE'
      ),
    };
  }

  // Check file size
  const fileInfo = await getFileInfo(uri);
  if (!fileInfo.exists) {
    return {
      valid: false,
      error: new ImageUploadError('Image file not found', 'FILE_READ_FAILED'),
    };
  }

  if (fileInfo.size > MAX_IMAGE_SIZE) {
    const sizeMB = (fileInfo.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: new ImageUploadError(
        `Image file is too large (${sizeMB} MB). Maximum size is 5 MB.`,
        'FILE_TOO_LARGE'
      ),
    };
  }

  return { valid: true };
}

/**
 * Generate unique storage path for image
 */
export function generateStoragePath(tenantId: string, messageId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${tenantId}/${messageId}/${timestamp}-${sanitizedFileName}`;
}

/**
 * Upload image to Supabase Storage and create attachment record.
 *
 * @param options - Upload options including tenant context and file info
 * @returns Upload result with public URL and attachment ID
 * @throws ImageUploadError if validation or upload fails
 *
 * @example
 * ```typescript
 * const result = await uploadImage({
 *   tenantId: 'tenant-uuid',
 *   messageId: 'message-uuid',
 *   imageUri: 'file:///path/to/image.jpg',
 *   fileName: 'photo.jpg',
 *   mimeType: 'image/jpeg',
 * });
 * console.log('Uploaded to:', result.url);
 * ```
 */
export async function uploadImage(options: ImageUploadOptions): Promise<ImageUploadResult> {
  const { tenantId, messageId, imageUri, fileName, mimeType } = options;

  // Validate image
  const validation = await validateImage(imageUri, mimeType);
  if (!validation.valid) {
    throw validation.error;
  }

  // Generate storage path
  const storagePath = generateStoragePath(tenantId, messageId, fileName);

  // Read file as base64
  let base64Data: string;
  try {
    base64Data = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });
  } catch {
    throw new ImageUploadError('Failed to read image file', 'FILE_READ_FAILED');
  }

  // Convert base64 to Uint8Array for upload
  const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(storagePath, binaryData, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new ImageUploadError(`Failed to upload image: ${uploadError.message}`, 'UPLOAD_FAILED');
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(storagePath);
  const publicUrl = publicUrlData.publicUrl;

  // Get file size for attachment record
  const fileInfo = await getFileInfo(imageUri);

  // Create attachment record
  const { data: attachment, error: attachmentError } = await supabase
    .from('attachments')
    .insert({
      tenant_id: tenantId,
      message_id: messageId,
      url: publicUrl,
      file_name: fileName,
      file_type: mimeType,
      file_size: fileInfo.size,
    })
    .select('id')
    .single();

  if (attachmentError || !attachment) {
    // Clean up uploaded file if attachment creation fails
    await supabase.storage.from('images').remove([storagePath]);
    throw new ImageUploadError(
      `Failed to create attachment record: ${attachmentError?.message ?? 'Unknown error'}`,
      'ATTACHMENT_FAILED'
    );
  }

  return {
    url: publicUrl,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    attachmentId: attachment.id,
    storagePath,
  };
}

/**
 * Delete an image from storage and its attachment record
 *
 * @param storagePath - Storage path of the image to delete
 * @param attachmentId - ID of the attachment record to delete
 */
export async function deleteImage(storagePath: string, attachmentId: string): Promise<void> {
  // Delete from storage
  const { error: storageError } = await supabase.storage.from('images').remove([storagePath]);

  if (storageError) {
    throw new ImageUploadError(
      `Failed to delete image from storage: ${storageError.message}`,
      'UPLOAD_FAILED'
    );
  }

  // Delete attachment record
  const { error: attachmentError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId);

  if (attachmentError) {
    throw new ImageUploadError(
      `Failed to delete attachment record: ${attachmentError.message}`,
      'ATTACHMENT_FAILED'
    );
  }
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(fileName: string): AllowedMimeType | null {
  const extension = fileName.toLowerCase().split('.').pop();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return null;
  }
}
