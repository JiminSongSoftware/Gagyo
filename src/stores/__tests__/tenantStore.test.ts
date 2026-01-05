/**
 * Unit tests for tenant store.
 *
 * Tests AsyncStorage persistence and tenant context management.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTenantStore, useTenantContext } from '../tenantStore';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  },
}));

describe('tenantStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useTenantStore.setState({
      activeTenantId: null,
      activeTenantName: null,
      loading: false,
    });
  });

  describe('setActiveTenant', () => {
    it('should set active tenant and persist to storage', async () => {
      const { result } = renderHook(() => useTenantStore());

      await act(async () => {
        await result.current.setActiveTenant('tenant-123', 'Test Church');
      });

      expect(result.current.activeTenantId).toBe('tenant-123');
      expect(result.current.activeTenantName).toBe('Test Church');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@gagyo:active_tenant_id',
        'tenant-123'
      );
    });

    it('should update existing tenant when called multiple times', async () => {
      const { result } = renderHook(() => useTenantStore());

      await act(async () => {
        await result.current.setActiveTenant('tenant-123', 'Test Church');
        await result.current.setActiveTenant('tenant-456', 'Another Church');
      });

      expect(result.current.activeTenantId).toBe('tenant-456');
      expect(result.current.activeTenantName).toBe('Another Church');
    });
  });

  describe('clearTenantContext', () => {
    it('should clear tenant context and remove from storage', async () => {
      const { result } = renderHook(() => useTenantStore());

      // First set a tenant
      await act(async () => {
        await result.current.setActiveTenant('tenant-123', 'Test Church');
      });

      expect(result.current.activeTenantId).toBe('tenant-123');

      // Then clear it
      await act(async () => {
        await result.current.clearTenantContext();
      });

      expect(result.current.activeTenantId).toBeNull();
      expect(result.current.activeTenantName).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@gagyo:active_tenant_id');
    });

    it('should handle clearing when no tenant is set', async () => {
      const { result } = renderHook(() => useTenantStore());

      await act(async () => {
        await result.current.clearTenantContext();
      });

      expect(result.current.activeTenantId).toBeNull();
      expect(result.current.activeTenantName).toBeNull();
    });
  });

  describe('loadTenantFromStorage', () => {
    it('should load tenant from storage and validate membership', async () => {
      const { supabase } = require('@/lib/supabase');

      // Mock AsyncStorage to return a tenant ID
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('tenant-123');

      // Mock Supabase auth to return a user
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      // Mock membership query to return active membership
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { id: 'membership-123' },
                error: null,
              }),
            })),
          })),
        })),
      });

      // Mock tenant name query
      const mockTenantData = { name: 'Test Church' };
      supabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockTenantData,
            })),
          })),
        })),
      }));

      const { result } = renderHook(() => useTenantStore());

      await act(async () => {
        await result.current.loadTenantFromStorage();
      });

      expect(result.current.activeTenantId).toBe('tenant-123');
      expect(result.current.activeTenantName).toBe('Test Church');
      expect(result.current.loading).toBe(false);
    });

    it('should clear tenant if membership is no longer active', async () => {
      const { supabase } = require('@/lib/supabase');

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('tenant-123');

      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      // Mock membership query to return no data (membership inactive)
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: null,
                error: { message: 'Not found' },
              }),
            })),
          })),
        })),
      });

      const { result } = renderHook(() => useTenantStore());

      await act(async () => {
        await result.current.loadTenantFromStorage();
      });

      expect(result.current.activeTenantId).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should handle no tenant in storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useTenantStore());

      await act(async () => {
        await result.current.loadTenantFromStorage();
      });

      expect(result.current.activeTenantId).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe('useTenantContext hook', () => {
    it('should provide tenant context with all fields', () => {
      const { result } = renderHook(() => useTenantContext());

      expect(result.current).toHaveProperty('activeTenantId');
      expect(result.current).toHaveProperty('activeTenantName');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('hasTenant');
      expect(result.current).toHaveProperty('setActiveTenant');
      expect(result.current).toHaveProperty('clearTenantContext');
    });

    it('should return hasTenant as true when tenant is set', async () => {
      const { result } = renderHook(() => useTenantContext());

      expect(result.current.hasTenant).toBe(false);

      await act(async () => {
        await result.current.setActiveTenant('tenant-123', 'Test Church');
      });

      expect(result.current.hasTenant).toBe(true);
    });
  });
});
