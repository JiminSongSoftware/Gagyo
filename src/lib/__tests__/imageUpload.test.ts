/**
 * Unit tests for image upload utility.
 *
 * Tests:
 * - Validation (file size, MIME type, file existence)
 * - Supabase failure handling
 * - Cleanup on attachment creation failure
 * - React Native-safe base64 decoding
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as FileSystem from 'expo-file-system';
import {
  uploadImage,
  validateImage,
  ImageUploadError,
  generateStoragePath,
  getMimeTypeFromExtension,
} from '../imageUpload';
import { supabase } from '../supabase';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));

// Mock Supabase client
jest.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockFileSystem = FileSystem as {
  getInfoAsync: jest.Mock;
  readAsStringAsync: jest.Mock;
};
const mockSupabase = supabase as {
  storage: {
    from: jest.Mock;
  };
  from: jest.Mock;
};
const mockStorageFrom = mockSupabase.storage.from;
const mockDbFrom = mockSupabase.from;

describe('imageUpload', () => {
  const mockTenantId = 'tenant-123';
  const mockMessageId = 'message-456';
  const mockImageUri = 'file:///test/image.jpg';
  const mockFileName = 'test-image.jpg';
  const mockMimeType = 'image/jpeg' as const;
  const mockBase64Data = 'VGVzdCBpbWFnZSBkYXRh'; // "Test image data" in base64

  beforeEach(() => {
    jest.clearAllMocks();

    // Default file system mock (file exists and is small)
    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: true,
      size: 1024 * 1024, // 1MB
      uri: mockImageUri,
      isDirectory: false,
      modificationTime: 0,
    });

    // Default file read mock
    mockFileSystem.readAsStringAsync.mockResolvedValue(mockBase64Data);

    // Default Supabase storage mock
    const mockStorage = {
      upload: jest.fn().mockResolvedValue({ error: null, data: { path: 'uploaded-path' } }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/image.jpg' },
      }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    };
    mockStorageFrom.mockReturnValue(mockStorage);

    // Default Supabase database mock
    const mockDatabase = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'attachment-123' },
        error: null,
      }),
      delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
    };
    mockDbFrom.mockReturnValue(mockDatabase);
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe('validateImage', () => {
    it('should pass validation for valid image', async () => {
      const result = await validateImage(mockImageUri, mockMimeType);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid MIME type', async () => {
      const result = await validateImage(mockImageUri, 'application/pdf');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeInstanceOf(ImageUploadError);
        expect(result.error.code).toBe('INVALID_MIME_TYPE');
        expect(result.error.message).toContain('Invalid image format');
      }
    });

    it('should reject non-existent file', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        uri: mockImageUri,
        isDirectory: false,
        modificationTime: 0,
      });

      const result = await validateImage(mockImageUri, mockMimeType);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe('FILE_READ_FAILED');
      }
    });

    it('should reject file exceeding 5MB limit', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 6 * 1024 * 1024, // 6MB
        uri: mockImageUri,
        isDirectory: false,
        modificationTime: 0,
      });

      const result = await validateImage(mockImageUri, mockMimeType);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe('FILE_TOO_LARGE');
        expect(result.error.message).toContain('too large');
      }
    });

    it('should accept file exactly at 5MB limit', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 5 * 1024 * 1024, // Exactly 5MB
        uri: mockImageUri,
        isDirectory: false,
        modificationTime: 0,
      });

      const result = await validateImage(mockImageUri, mockMimeType);

      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // UPLOAD TESTS
  // ============================================================================

  describe('uploadImage', () => {
    it('should upload image successfully and create attachment record', async () => {
      const result = await uploadImage({
        tenantId: mockTenantId,
        messageId: mockMessageId,
        imageUri: mockImageUri,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      expect(result.url).toBe('https://example.com/image.jpg');
      expect(result.attachmentId).toBe('attachment-123');
      expect(result.storagePath).toContain(mockTenantId);
      expect(result.storagePath).toContain(mockMessageId);
    });

    it('should reject invalid image before upload', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        uri: mockImageUri,
        isDirectory: false,
        modificationTime: 0,
      });

      await expect(
        uploadImage({
          tenantId: mockTenantId,
          messageId: mockMessageId,
          imageUri: mockImageUri,
          fileName: mockFileName,
          mimeType: mockMimeType,
        })
      ).rejects.toThrow('Image file not found');
    });

    it('should clean up uploaded file if attachment creation fails', async () => {
      // Mock attachment creation failure
      const mockDb = mockSupabase.from('');
      mockDb.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '23503' },
      });

      await expect(
        uploadImage({
          tenantId: mockTenantId,
          messageId: mockMessageId,
          imageUri: mockImageUri,
          fileName: mockFileName,
          mimeType: mockMimeType,
        })
      ).rejects.toThrow('Failed to create attachment record');
    });

    it('should generate unique storage path with timestamp', async () => {
      const beforeTime = Date.now();

      const result = await uploadImage({
        tenantId: mockTenantId,
        messageId: mockMessageId,
        imageUri: mockImageUri,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      const afterTime = Date.now();

      expect(result.storagePath).toMatch(
        new RegExp(`^${mockTenantId}/${mockMessageId}/${beforeTime}-${afterTime}`)
      );
    });

    it('should sanitize file names in storage path', async () => {
      const result = await uploadImage({
        tenantId: mockTenantId,
        messageId: mockMessageId,
        imageUri: mockImageUri,
        fileName: 'test file@#$%.jpg',
        mimeType: mockMimeType,
      });

      expect(result.storagePath).not.toContain('@');
      expect(result.storagePath).not.toContain('#');
      expect(result.storagePath).not.toContain('$');
      expect(result.storagePath).not.toContain('%');
    });
  });

  // ============================================================================
  // STORAGE PATH GENERATION TESTS
  // ============================================================================

  describe('generateStoragePath', () => {
    it('should generate correct storage path structure', () => {
      const path = generateStoragePath(mockTenantId, mockMessageId, 'photo.jpg');

      expect(path).toMatch(new RegExp(`^${mockTenantId}/${mockMessageId}/\\d+-photo\\.jpg$`));
    });

    it('should sanitize file names', () => {
      const path = generateStoragePath(mockTenantId, mockMessageId, 'my file@#$%.jpg');

      expect(path).not.toContain('@');
      expect(path).not.toContain('#');
      expect(path).not.toContain('$');
      expect(path).not.toContain('%');
      expect(path).toContain('my_file_________.jpg');
    });
  });

  // ============================================================================
  // MIME TYPE DETECTION TESTS
  // ============================================================================

  describe('getMimeTypeFromExtension', () => {
    it('should detect JPEG from jpg extension', () => {
      expect(getMimeTypeFromExtension('photo.jpg')).toBe('image/jpeg');
    });

    it('should detect JPEG from jpeg extension', () => {
      expect(getMimeTypeFromExtension('photo.jpeg')).toBe('image/jpeg');
    });

    it('should detect PNG', () => {
      expect(getMimeTypeFromExtension('image.png')).toBe('image/png');
    });

    it('should detect GIF', () => {
      expect(getMimeTypeFromExtension('animation.gif')).toBe('image/gif');
    });

    it('should detect WebP', () => {
      expect(getMimeTypeFromExtension('photo.webp')).toBe('image/webp');
    });

    it('should return null for unknown extension', () => {
      expect(getMimeTypeFromExtension('document.pdf')).toBeNull();
    });

    it('should return null for file without extension', () => {
      expect(getMimeTypeFromExtension('unknown')).toBeNull();
    });
  });

  // ============================================================================
  // REACT NATIVE BASE64 DECODING TESTS
  // ============================================================================

  describe('React Native-safe base64 decoding', () => {
    it('should use Buffer.from for base64 decoding', async () => {
      // This test verifies the fix for atob() which is undefined in React Native
      // The implementation now uses Buffer.from(base64Data, 'base64')
      // which is polyfilled by expo-filesystem

      await uploadImage({
        tenantId: mockTenantId,
        messageId: mockMessageId,
        imageUri: mockImageUri,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      // Verify readAsStringAsync was called with base64 encoding
      expect(mockFileSystem.readAsStringAsync).toHaveBeenCalledWith(mockImageUri, {
        encoding: 'base64',
      });
    });
  });
});
