/**
 * Unit tests for unified tracking utilities.
 *
 * These tests verify that the tracking layer correctly calls both Sentry
 * and PostHog with appropriate data and context enrichment.
 */

import { trackEvent, trackError, trackNavigation, trackApiCall, getTrackingContext, setTrackingContext } from '../tracking';
import * as sentry from '../sentry';
import * as posthog from '../posthog';

// Mock dependencies
jest.mock('../sentry');
jest.mock('../posthog');

const mockSentryCaptureError = jest.spyOn(sentry, 'captureError');
const mockSentryAddBreadcrumb = jest.spyOn(sentry, 'addBreadcrumb');
const mockPostHogTrack = jest.spyOn(posthog, 'trackEvent');

describe('Tracking Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset tracking context
    setTrackingContext({
      tenant_id: 'tenant-123',
      user_role: 'admin',
      locale: 'en',
      app_version: '1.0.0',
    });
  });

  describe('trackEvent', () => {
    it('should track event in PostHog with enriched context', () => {
      trackEvent('user_signed_in', {
        method: 'email',
      });

      expect(mockPostHogTrack).toHaveBeenCalledWith('user_signed_in', {
        method: 'email',
        tenant_id: 'tenant-123',
        user_role: 'admin',
        locale: 'en',
        app_version: '1.0.0',
      });
    });

    it('should add breadcrumb in Sentry for user actions', () => {
      trackEvent('message_sent', {
        conversation_type: 'direct',
      });

      expect(mockSentryAddBreadcrumb).toHaveBeenCalledWith({
        category: 'user',
        type: 'user',
        message: 'message_sent',
        level: 'info',
        data: expect.objectContaining({
          conversation_type: 'direct',
        }),
      });
    });

    it('should override context when provided', () => {
      trackEvent('tenant_switched', {
        from_tenant: 'tenant-123',
        to_tenant: 'tenant-456',
        tenant_id: 'tenant-456',
      });

      expect(mockPostHogTrack).toHaveBeenCalledWith('tenant_switched', {
        from_tenant: 'tenant-123',
        to_tenant: 'tenant-456',
        tenant_id: 'tenant-456',
        user_role: 'admin',
        locale: 'en',
        app_version: '1.0.0',
      });
    });
  });

  describe('trackError', () => {
    it('should capture error in Sentry with enriched context', () => {
      const error = new Error('Test error');
      const context = {
        feature: 'chat',
        action: 'send_message',
      };

      trackError(error, context);

      expect(mockSentryCaptureError).toHaveBeenCalledWith(error, {
        feature: 'chat',
        action: 'send_message',
        tenant_id: 'tenant-123',
        user_role: 'admin',
        locale: 'en',
      });
    });

    it('should use warning level for non-fatal errors', () => {
      const error = new Error('Non-fatal error');

      trackError(error, {}, 'warning');

      expect(mockSentryCaptureError).toHaveBeenCalledWith(error, expect.objectContaining({
        level: 'warning',
      }));
    });

    it('should add error breadcrumb', () => {
      const error = new Error('API error');

      trackError(error, { endpoint: '/api/messages' });

      expect(mockSentryAddBreadcrumb).toHaveBeenCalledWith({
        category: 'http',
        message: 'Error: API error',
        level: 'error',
        data: {
          endpoint: '/api/messages',
        },
      });
    });
  });

  describe('trackNavigation', () => {
    it('should track screen view in PostHog', () => {
      trackNavigation('ChatScreen', { conversationId: 'conv-123' });

      expect(mockPostHogTrack).toHaveBeenCalledWith('screen_viewed', {
        screen_name: 'ChatScreen',
        params: { conversationId: 'conv-123' },
        tenant_id: 'tenant-123',
        locale: 'en',
        app_version: '1.0.0',
      });
    });

    it('should add navigation breadcrumb in Sentry', () => {
      trackNavigation('ChatScreen', undefined, 'HomeScreen');

      expect(mockSentryAddBreadcrumb).toHaveBeenCalledWith({
        category: 'navigation',
        type: 'navigation',
        message: 'Navigated to ChatScreen',
        level: 'info',
        data: {
          from: 'HomeScreen',
          to: 'ChatScreen',
        },
      });
    });
  });

  describe('trackApiCall', () => {
    it('should track successful API call', () => {
      trackApiCall({
        endpoint: '/api/messages',
        method: 'GET',
        status: 200,
        duration_ms: 150,
        success: true,
      });

      expect(mockSentryAddBreadcrumb).toHaveBeenCalledWith({
        category: 'http',
        type: 'http',
        message: 'GET /api/messages - 200',
        level: 'info',
        data: {
          endpoint: '/api/messages',
          method: 'GET',
          status: 200,
          duration_ms: 150,
        },
      });
    });

    it('should track failed API call as error', () => {
      trackApiCall({
        endpoint: '/api/messages',
        method: 'POST',
        status: 500,
        duration_ms: 300,
        success: false,
        error_code: 'INTERNAL_ERROR',
      });

      expect(mockSentryAddBreadcrumb).toHaveBeenCalledWith({
        category: 'http',
        type: 'http',
        message: 'POST /api/messages - 500',
        level: 'error',
        data: {
          endpoint: '/api/messages',
          method: 'POST',
          status: 500,
          duration_ms: 300,
          error_code: 'INTERNAL_ERROR',
        },
      });
    });
  });

  describe('getTrackingContext', () => {
    it('should return current tracking context', () => {
      const context = getTrackingContext();

      expect(context).toEqual({
        tenant_id: 'tenant-123',
        user_role: 'admin',
        locale: 'en',
        app_version: '1.0.0',
      });
    });

    it('should return empty context when not set', () => {
      setTrackingContext(null);
      const context = getTrackingContext();

      expect(context).toBeNull();
    });
  });

  describe('setTrackingContext', () => {
    it('should update tracking context', () => {
      setTrackingContext({
        tenant_id: 'new-tenant',
        user_role: 'member',
        locale: 'ko',
        app_version: '1.0.0',
      });

      const context = getTrackingContext();
      expect(context?.tenant_id).toBe('new-tenant');
      expect(context?.user_role).toBe('member');
      expect(context?.locale).toBe('ko');
    });

    it('should merge with existing context when partial update', () => {
      setTrackingContext({
        tenant_id: 'tenant-123',
        user_role: 'admin',
        locale: 'en',
        app_version: '1.0.0',
      });

      setTrackingContext({
        locale: 'ko',
      });

      const context = getTrackingContext();
      expect(context).toEqual({
        tenant_id: 'tenant-123',
        user_role: 'admin',
        locale: 'ko',
        app_version: '1.0.0',
      });
    });
  });
});
