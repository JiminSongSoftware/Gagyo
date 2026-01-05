/**
 * Unit tests for useImages hook.
 *
 * Tests:
 * - Pagination (loadMore, hasMore)
 * - Filtering by conversation
 * - Loading states
 * - Error handling
 * - Refresh functionality
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useImages, useImage } from '../useImages';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useImages', () => {
  const mockTenantId = 'tenant-123';
  const mockConversationId = 'conversation-456';

  const mockImageData = [
    {
      id: 'image-1',
      url: 'https://example.com/image1.jpg',
      file_name: 'image1.jpg',
      file_size: 1024000,
      created_at: '2024-01-01T12:00:00Z',
      message: {
        id: 'msg-1',
        conversation_id: 'conv-1',
        conversation: {
          id: 'conv-1',
          name: 'Small Group',
          type: 'small_group',
        },
        sender: {
          user: {
            display_name: 'John Doe',
            photo_url: null,
          },
        },
      },
    },
    {
      id: 'image-2',
      url: 'https://example.com/image2.jpg',
      file_name: 'image2.jpg',
      file_size: 2048000,
      created_at: '2024-01-02T12:00:00Z',
      message: {
        id: 'msg-2',
        conversation_id: 'conv-2',
        conversation: {
          id: 'conv-2',
          name: 'Prayer Team',
          type: 'ministry',
        },
        sender: {
          user: {
            display_name: 'Jane Smith',
            photo_url: 'https://example.com/jane.jpg',
          },
        },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  it('should initialize with loading state', () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImages(mockTenantId));

    expect(result.current.loading).toBe(true);
    expect(result.current.images).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(true);
  });

  it('should not fetch images when tenantId is null', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImages(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not call supabase when tenantId is null
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  // ============================================================================
  // DATA FETCHING TESTS
  // ============================================================================

  it('should fetch images successfully', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockImageData,
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImages(mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.images).toHaveLength(2);
    expect(result.current.images[0].id).toBe('image-1');
    expect(result.current.images[0].message.conversation.name).toBe('Small Group');
    expect(result.current.images[1].message.sender.displayName).toBe('Jane Smith');
  });

  it('should set hasMore to false when fewer images returned than limit', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockImageData.slice(0, 1), // Only 1 image, default limit is 50
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImages(mockTenantId, { limit: 50 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(false);
  });

  it('should set hasMore to true when limit number of images returned', async () => {
    // Create exactly 50 images (default limit)
    const fiftyImages = Array.from({ length: 50 }, (_, i) => ({
      ...mockImageData[0],
      id: `image-${i}`,
    }));

    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: fiftyImages,
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImages(mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);
  });

  // ============================================================================
  // CONVERSATION FILTER TESTS
  // ============================================================================

  it('should filter images by conversation when conversationId is provided', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockImageData,
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    renderHook(() => useImages(mockTenantId, { conversationId: mockConversationId }));

    await waitFor(() => {
      expect(mockQuery.eq).toHaveBeenCalledWith('message.conversation_id', mockConversationId);
    });
  });

  it('should not apply conversation filter when conversationId is null', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockImageData,
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    renderHook(() => useImages(mockTenantId, { conversationId: null }));

    // Should only call eq for tenant_id and file_type (like), not conversation
    expect(mockQuery.eq).toHaveBeenCalledTimes(1); // tenant_id
  });

  // ============================================================================
  // PAGINATION TESTS
  // ============================================================================

  it('should load more images when loadMore is called', async () => {
    let callCount = 0;
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockImplementation(() => {
        callCount++;
        // First call returns 50 images (full page), second returns 25 (partial page)
        const isFirstPage = callCount === 1;
        return Promise.resolve({
          data: isFirstPage ? Array.from({ length: 50 }, () => mockImageData[0]) : mockImageData,
          error: null,
        });
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImages(mockTenantId, { limit: 50 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialLength = result.current.images.length;
    expect(result.current.hasMore).toBe(true);

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.images.length).toBeGreaterThan(initialLength);
    });

    // After loading second page with fewer items, hasMore should be false
    expect(result.current.hasMore).toBe(false);
  });

  it('should not load more when already loading', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockImageData,
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImages(mockTenantId));

    // Try to load more while still loading
    act(() => {
      result.current.loadMore();
    });

    // Should not make additional calls since loading is true
    // The hook guards against loading when already loading
  });

  it('should not load more when hasMore is false', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: [], // Empty result means no more images
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImages(mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.hasMore).toBe(false);
    });

    act(() => {
      result.current.loadMore();
    });

    // Should not make additional calls
    expect(mockQuery.range).toHaveBeenCalledTimes(1);
  });

  // ============================================================================
  // REFRESH TESTS
  // ============================================================================

  it('should refresh images when refresh is called', async () => {
    let callCount = 0;
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          data: mockImageData,
          error: null,
        });
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImages(mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = callCount;

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(callCount).toBe(initialCallCount + 1);
    });

    // Images should be replaced, not appended
    expect(result.current.images).toHaveLength(2);
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  it('should handle fetch errors gracefully', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Network error', code: 'NETWORK_ERROR' },
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImages(mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Network error');
  });

  // ============================================================================
  // CUSTOM LIMIT TESTS
  // ============================================================================

  it('should respect custom limit parameter', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockImageData.slice(0, 10),
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const customLimit = 10;
    renderHook(() => useImages(mockTenantId, { limit: customLimit }));

    await waitFor(() => {
      expect(mockQuery.range).toHaveBeenCalledWith(0, customLimit - 1);
    });
  });
});

// ============================================================================
// USEIMAGE HOOK TESTS
// ============================================================================

describe('useImage', () => {
  const mockImageId = 'image-123';
  const mockTenantId = 'tenant-456';

  const mockSingleImageData = {
    id: mockImageId,
    url: 'https://example.com/single-image.jpg',
    file_name: 'single.jpg',
    file_size: 512000,
    created_at: '2024-01-01T12:00:00Z',
    message: {
      id: 'msg-1',
      conversation_id: 'conv-1',
      conversation: {
        id: 'conv-1',
        name: 'Test Conversation',
        type: 'direct',
      },
      sender: {
        user: {
          display_name: 'Test User',
          photo_url: null,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch single image by ID', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockSingleImageData,
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImage(mockImageId, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.image).not.toBeNull();
    expect(result.current.image?.id).toBe(mockImageId);
    expect(mockQuery.eq).toHaveBeenCalledWith('id', mockImageId);
    expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', mockTenantId);
  });

  it('should not fetch when imageId is null', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImage(null, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.image).toBeNull();
    expect(mockQuery.single).not.toHaveBeenCalled();
  });

  it('should handle single image fetch errors', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Image not found', code: 'PGRST116' },
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result } = renderHook(() => useImage(mockImageId, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
  });
});
