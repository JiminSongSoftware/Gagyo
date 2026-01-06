/**
 * Unit tests for useTracking hook.
 *
 * These tests verify that the hook correctly provides tracking functions
 * with automatic context injection and proper memoization.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useTracking } from '../useTracking';
import * as tracking from '@/lib/monitoring/tracking';
import * as PostHogModule from '@/lib/monitoring/posthog';

// Mock dependencies
jest.mock('@/lib/monitoring/tracking');
jest.mock('@/lib/monitoring/posthog');
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/stores/tenantStore', () => ({
  useTenantStore: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      version: '1.0.0',
    },
  },
}));

const mockTrackEvent = jest.spyOn(tracking, 'trackEvent');
const mockTrackError = jest.spyOn(tracking, 'trackError');
const mockTrackNavigation = jest.spyOn(tracking, 'trackNavigation');
const mockTrackApiCall = jest.spyOn(tracking, 'trackApiCall');
const mockTrackSignIn = jest.spyOn(tracking, 'trackSignIn');
const mockTrackSignOut = jest.spyOn(tracking, 'trackSignOut');
const mockSetTrackingContext = jest.spyOn(tracking, 'setTrackingContext');
const mockClearTrackingContext = jest.spyOn(tracking, 'clearTrackingContext');
const mockPostHogIdentifyUser = jest.spyOn(PostHogModule, 'identifyUser');

// Import mocked modules
import { useAuth } from '@/hooks/useAuth';
import { useTenantStore } from '@/stores/tenantStore';

describe('useTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default auth state
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: 'user-123',
        locale: 'en',
        email: 'test@example.com',
        display_name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
      },
    });

    // Setup default tenant state
    (useTenantStore as jest.Mock).mockReturnValue({
      activeTenant: {
        id: 'tenant-123',
        name: 'Test Tenant',
        created_at: '2024-01-01T00:00:00Z',
      },
      activeMembership: {
        role: 'admin',
      },
    });
  });

  describe('trackEvent', () => {
    it('should track event with enriched context', () => {
      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.trackEvent('message_sent', {
          conversation_type: 'direct',
        });
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('message_sent', {
        conversation_type: 'direct',
        tenant_id: 'tenant-123',
        user_role: 'admin',
        locale: 'en',
        app_version: '1.0.0',
      });
    });

    it('should allow overriding context properties', () => {
      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.trackEvent('tenant_switched', {
          tenant_id: 'tenant-456',
        });
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('tenant_switched', {
        tenant_id: 'tenant-456',
        user_role: 'admin',
        locale: 'en',
        app_version: '1.0.0',
      });
    });

    it('should return stable function reference', () => {
      const { result, rerender } = renderHook(() => useTracking());

      const firstTrackEvent = result.current.trackEvent;

      rerender();

      expect(result.current.trackEvent).toBe(firstTrackEvent);
    });
  });

  describe('trackError', () => {
    it('should track error with enriched context', () => {
      const { result } = renderHook(() => useTracking());
      const error = new Error('Test error');

      act(() => {
        result.current.trackError(error, {
          feature: 'chat',
        });
      });

      expect(mockTrackError).toHaveBeenCalledWith(error, {
        feature: 'chat',
        tenant_id: 'tenant-123',
        user_role: 'admin',
        locale: 'en',
      });
    });

    it('should support different error levels', () => {
      const { result } = renderHook(() => useTracking());
      const error = new Error('Warning');

      act(() => {
        result.current.trackError(error, {}, 'warning');
      });

      expect(mockTrackError).toHaveBeenCalledWith(error, expect.any(Object), 'warning');
    });

    it('should return stable function reference', () => {
      const { result, rerender } = renderHook(() => useTracking());

      const firstTrackError = result.current.trackError;

      rerender();

      expect(result.current.trackError).toBe(firstTrackError);
    });
  });

  describe('trackNavigation', () => {
    it('should track navigation event', () => {
      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.trackNavigation('ChatScreen', { conversationId: 'conv-123' }, 'HomeScreen');
      });

      expect(mockTrackNavigation).toHaveBeenCalledWith('ChatScreen', { conversationId: 'conv-123' }, 'HomeScreen');
    });

    it('should return stable function reference', () => {
      const { result, rerender } = renderHook(() => useTracking());

      const firstTrackNavigation = result.current.trackNavigation;

      rerender();

      expect(result.current.trackNavigation).toBe(firstTrackNavigation);
    });
  });

  describe('trackApiCall', () => {
    it('should track API call', () => {
      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.trackApiCall({
          endpoint: '/api/messages',
          method: 'GET',
          status: 200,
          duration_ms: 150,
          success: true,
        });
      });

      expect(mockTrackApiCall).toHaveBeenCalledWith({
        endpoint: '/api/messages',
        method: 'GET',
        status: 200,
        duration_ms: 150,
        success: true,
      });
    });

    it('should track failed API call with error code', () => {
      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.trackApiCall({
          endpoint: '/api/messages',
          method: 'POST',
          status: 500,
          duration_ms: 300,
          success: false,
          error_code: 'INTERNAL_ERROR',
        });
      });

      expect(mockTrackApiCall).toHaveBeenCalledWith({
        endpoint: '/api/messages',
        method: 'POST',
        status: 500,
        duration_ms: 300,
        success: false,
        error_code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('trackSignIn', () => {
    it('should track sign in with tenant ID', () => {
      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.trackSignIn();
      });

      expect(mockTrackSignIn).toHaveBeenCalledWith('email', 'tenant-123');
    });

    it('should not track when no tenant is active', () => {
      (useTenantStore as jest.Mock).mockReturnValue({
        activeTenant: null,
        activeMembership: null,
      });

      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.trackSignIn();
      });

      expect(mockTrackSignIn).not.toHaveBeenCalled();
    });
  });

  describe('trackSignOut', () => {
    it('should track sign out and clear context', () => {
      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.trackSignOut();
      });

      expect(mockTrackSignOut).toHaveBeenCalledWith('tenant-123');
      expect(mockClearTrackingContext).toHaveBeenCalled();
    });

    it('should not track when no tenant is active', () => {
      (useTenantStore as jest.Mock).mockReturnValue({
        activeTenant: null,
        activeMembership: null,
      });

      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.trackSignOut();
      });

      expect(mockTrackSignOut).not.toHaveBeenCalled();
      expect(mockClearTrackingContext).toHaveBeenCalled();
    });
  });

  describe('identifyUser', () => {
    it('should identify user with enriched properties', () => {
      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.identifyUser('user-123', {
          tenant_count: 2,
        });
      });

      expect(mockPostHogIdentifyUser).toHaveBeenCalledWith('user-123', {
        tenant_count: 2,
        primary_role: 'member',
        locale: 'en',
        created_at: '2024-01-01T00:00:00Z',
        email: 'test@example.com',
        display_name: 'Test User',
      });
    });

    it('should use default values when user data is missing', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
      });

      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.identifyUser('user-456');
      });

      expect(mockPostHogIdentifyUser).toHaveBeenCalledWith('user-456', {
        tenant_count: 0,
        primary_role: 'member',
        locale: 'en',
        created_at: expect.any(String),
      });
    });
  });

  describe('setTenantGroup', () => {
    it('should set tenant group with properties', () => {
      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.setTenantGroup('tenant-123', {
          name: 'Test Tenant',
          member_count: 10,
        });
      });

      expect(tracking.setGroup).toHaveBeenCalledWith('tenant', 'tenant-123', {
        name: 'Test Tenant',
        member_count: 10,
        created_at: '2024-01-01T00:00:00Z',
      });
    });

    it('should merge with tenant created_at', () => {
      const { result } = renderHook(() => useTracking());

      act(() => {
        result.current.setTenantGroup('tenant-456');
      });

      expect(tracking.setGroup).toHaveBeenCalledWith('tenant', 'tenant-456', {
        name: '',
        member_count: 0,
        created_at: '2024-01-01T00:00:00Z',
      });
    });
  });

  describe('context update on hook mount', () => {
    it('should update tracking context when tenant changes', () => {
      const { rerender } = renderHook(() => useTracking());

      // Initial render
      expect(mockSetTrackingContext).toHaveBeenCalledWith({
        tenant_id: 'tenant-123',
        user_role: 'admin',
        locale: 'en',
        app_version: '1.0.0',
      });

      // Change tenant
      (useTenantStore as jest.Mock).mockReturnValue({
        activeTenant: {
          id: 'tenant-456',
          name: 'Another Tenant',
          created_at: '2024-01-01T00:00:00Z',
        },
        activeMembership: {
          role: 'member',
        },
      });

      rerender();

      expect(mockSetTrackingContext).toHaveBeenCalledWith({
        tenant_id: 'tenant-456',
        user_role: 'member',
        locale: 'en',
        app_version: '1.0.0',
      });
    });

    it('should not update context when tenant is null', () => {
      (useTenantStore as jest.Mock).mockReturnValue({
        activeTenant: null,
        activeMembership: null,
      });

      renderHook(() => useTracking());

      expect(mockSetTrackingContext).not.toHaveBeenCalled();
    });
  });

  describe('memoization', () => {
    it('should return stable object reference', () => {
      const { result, rerender } = renderHook(() => useTracking());

      const firstResult = result.current;

      rerender();

      expect(result.current).toBe(firstResult);
    });

    it('should update functions when dependencies change', () => {
      const { result, rerender } = renderHook(() => useTracking());

      const firstTrackEvent = result.current.trackEvent;

      // Change locale
      (useAuth as jest.Mock).mockReturnValue({
        user: {
          id: 'user-123',
          locale: 'ko',
          email: 'test@example.com',
          display_name: 'Test User',
          created_at: '2024-01-01T00:00:00Z',
        },
      });

      rerender();

      const secondTrackEvent = result.current.trackEvent;

      expect(secondTrackEvent).not.toBe(firstTrackEvent);
    });
  });
});
