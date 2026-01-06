/**
 * Unit tests for useUploadProfilePhoto hook.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUploadProfilePhoto } from '../useUploadProfilePhoto';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

// Mock fetch for file reading
global.fetch = jest.fn() as unknown as typeof fetch;

const mockSupabase = supabase as {
  auth: {
    getUser: jest.Mock;
  };
  from: jest.Mock;
  storage: {
    from: jest.Mock;
  };
};
const mockGetUser = mockSupabase.auth.getUser;
const mockFrom = mockSupabase.from;
const mockStorageFrom = mockSupabase.storage.from;
const mockLaunchImageLibraryAsync = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('useUploadProfilePhoto', () => {
  const mockUserId = 'user-123';
  const mockPhotoUrl = 'https://example.com/profile-photos/user-123/1234567890.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
    // Default auth mock - user is authenticated
    mockGetUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Default storage mock
    mockStorageFrom.mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: { path: 'user-123/1234567890.jpg' },
        error: null,
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: mockPhotoUrl },
      }),
      list: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      remove: jest.fn().mockResolvedValue({
        error: null,
      }),
    });

    // Default database mock
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: null,
      }),
    });
    mockFrom.mockReturnValue({ update: updateMock });

    // Mock fetch for file reading
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['fake image data'], { type: 'image/jpeg' })),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024 * 100)), // 100 KB
      } as Response)
    );
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useUploadProfilePhoto());

    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.uploadProfilePhoto).toBe('function');
    expect(typeof result.current.deleteProfilePhoto).toBe('function');
  });

  it('should return null when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useUploadProfilePhoto());

    let url;
    await act(async () => {
      url = await result.current.uploadProfilePhoto();
    });

    expect(url).toBeNull();
    expect(result.current.error?.message).toBe('User not authenticated');
  });

  it('should return null when image picker is canceled', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: true,
      assets: [],
    });

    const { result } = renderHook(() => useUploadProfilePhoto());

    let url;
    await act(async () => {
      url = await result.current.uploadProfilePhoto();
    });

    expect(url).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it('should upload photo successfully', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file://test.jpg',
          mimeType: 'image/jpeg',
          width: 500,
          height: 500,
        },
      ],
    });

    const { result } = renderHook(() => useUploadProfilePhoto());

    let url;
    await act(async () => {
      url = await result.current.uploadProfilePhoto();
    });

    expect(url).toBe(mockPhotoUrl);
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(1);
  });

  it('should validate file size (reject files over 5MB)', async () => {
    // Mock a large file
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        blob: () =>
          Promise.resolve(new Blob(['x'.repeat(6 * 1024 * 1024)], { type: 'image/jpeg' })), // 6 MB
      } as Response)
    );

    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file://large.jpg',
          mimeType: 'image/jpeg',
          width: 500,
          height: 500,
        },
      ],
    });

    const { result } = renderHook(() => useUploadProfilePhoto());

    let url;
    await act(async () => {
      url = await result.current.uploadProfilePhoto();
    });

    expect(url).toBeNull();
    expect(result.current.error?.message).toBe('Image size must be less than 5 MB');
  });

  it('should validate MIME type (reject non-image files)', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file://test.pdf',
          mimeType: 'application/pdf',
          width: 500,
          height: 500,
        },
      ],
    });

    const { result } = renderHook(() => useUploadProfilePhoto());

    let url;
    await act(async () => {
      url = await result.current.uploadProfilePhoto();
    });

    expect(url).toBeNull();
    expect(result.current.error?.message).toBe('Only JPEG, PNG, and WebP images are allowed');
  });

  it('should handle upload errors gracefully', async () => {
    const uploadError = new Error('Storage bucket not found');

    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file://test.jpg',
          mimeType: 'image/jpeg',
          width: 500,
          height: 500,
        },
      ],
    });

    mockStorageFrom.mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: null,
        error: uploadError,
      }),
    });

    const { result } = renderHook(() => useUploadProfilePhoto());

    let url;
    await act(async () => {
      url = await result.current.uploadProfilePhoto();
    });

    expect(url).toBeNull();
    expect(result.current.error).toEqual(uploadError);
  });

  it('should delete profile photo successfully', async () => {
    // Mock existing photos
    mockStorageFrom.mockReturnValue({
      list: jest.fn().mockResolvedValue({
        data: [{ name: 'photo1.jpg' }, { name: 'photo2.jpg' }],
        error: null,
      }),
      remove: jest.fn().mockResolvedValue({
        error: null,
      }),
    });

    const { result } = renderHook(() => useUploadProfilePhoto());

    let success;
    await act(async () => {
      success = await result.current.deleteProfilePhoto();
    });

    expect(success).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle delete gracefully when user has no photos', async () => {
    // Mock no existing photos
    mockStorageFrom.mockReturnValue({
      list: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });

    const { result } = renderHook(() => useUploadProfilePhoto());

    let success;
    await act(async () => {
      success = await result.current.deleteProfilePhoto();
    });

    expect(success).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle delete errors gracefully', async () => {
    const deleteError = new Error('Failed to delete file');

    mockStorageFrom.mockReturnValue({
      list: jest.fn().mockResolvedValue({
        data: [{ name: 'photo1.jpg' }],
        error: null,
      }),
      remove: jest.fn().mockResolvedValue({
        error: deleteError,
      }),
    });

    const { result } = renderHook(() => useUploadProfilePhoto());

    let success;
    await act(async () => {
      success = await result.current.deleteProfilePhoto();
    });

    expect(success).toBe(false);
    expect(result.current.error).toEqual(deleteError);
  });

  it('should set uploading state during upload', async () => {
    let resolveUpload: (value: unknown) => void;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });

    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file://test.jpg',
          mimeType: 'image/jpeg',
          width: 500,
          height: 500,
        },
      ],
    });

    mockStorageFrom.mockReturnValue({
      upload: jest.fn().mockImplementation(() => {
        setTimeout(() => {
          resolveUpload!({
            data: { path: 'user-123/1234567890.jpg' },
            error: null,
          });
        }, 50);
        return uploadPromise;
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: mockPhotoUrl },
      }),
    });

    const { result } = renderHook(() => useUploadProfilePhoto());

    expect(result.current.uploading).toBe(false);

    act(() => {
      void result.current.uploadProfilePhoto();
    });

    expect(result.current.uploading).toBe(true);

    await waitFor(() => {
      expect(result.current.uploading).toBe(false);
    });
  });
});
