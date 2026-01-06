/**
 * Unit tests for PostHog integration.
 *
 * These tests verify that PostHog initialization, event tracking, user identification,
 * and group analytics work correctly.
 */

import { initPostHog, trackEvent, identifyUser, resetUser, setGroup } from '../posthog';
import PostHog from 'posthog-react-native';

// Mock PostHog SDK
jest.mock('posthog-react-native', () => ({
  default: {
    init: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    group: jest.fn(),
    register: jest.fn(),
    screen: jest.fn(),
  },
}));

const mockPostHogInit = jest.mocked(PostHog.init);
const mockPostHogCapture = jest.mocked(PostHog.capture);
const mockPostHogIdentify = jest.mocked(PostHog.identify);
const mockPostHogReset = jest.mocked(PostHog.reset);
const mockPostHogGroup = jest.mocked(PostHog.group);

describe('PostHog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initPostHog', () => {
    it('should initialize PostHog with correct config', () => {
      initPostHog({
        apiKey: 'phc_test123',
        host: 'https://app.posthog.com',
        captureApplicationLifecycleEvents: true,
      });

      expect(mockPostHogInit).toHaveBeenCalledWith(
        'phc_test123',
        expect.objectContaining({
          host: 'https://app.posthog.com',
          captureApplicationLifecycleEvents: true,
        })
      );
    });

    it('should use default host when not specified', () => {
      initPostHog({
        apiKey: 'phc_test123',
      });

      expect(mockPostHogInit).toHaveBeenCalledWith(
        'phc_test123',
        expect.objectContaining({
          host: 'https://app.posthog.com',
        })
      );
    });

    it('should not initialize when API key is empty', () => {
      initPostHog({
        apiKey: '',
      });

      expect(mockPostHogInit).not.toHaveBeenCalled();
    });
  });

  describe('trackEvent', () => {
    it('should capture event with properties', () => {
      trackEvent('user_signed_in', {
        method: 'email',
        tenant_id: 'tenant-123',
        locale: 'en',
        app_version: '1.0.0',
      });

      expect(mockPostHogCapture).toHaveBeenCalledWith('user_signed_in', {
        method: 'email',
        tenant_id: 'tenant-123',
        locale: 'en',
        app_version: '1.0.0',
      });
    });

    it('should capture chat event with conversation type', () => {
      trackEvent('message_sent', {
        conversation_type: 'direct',
        has_attachment: true,
        is_event_chat: false,
        app_version: '1.0.0',
      });

      expect(mockPostHogCapture).toHaveBeenCalledWith('message_sent', {
        conversation_type: 'direct',
        has_attachment: true,
        is_event_chat: false,
        app_version: '1.0.0',
      });
    });

    it('should capture prayer event with scope', () => {
      trackEvent('prayer_card_created', {
        recipient_scope: 'small_group',
        has_attachment: false,
        app_version: '1.0.0',
      });

      expect(mockPostHogCapture).toHaveBeenCalledWith('prayer_card_created', {
        recipient_scope: 'small_group',
        has_attachment: false,
        app_version: '1.0.0',
      });
    });

    it('should capture pastoral journal event', () => {
      trackEvent('journal_submitted', {
        week_number: 12,
        content_length: 500,
        app_version: '1.0.0',
      });

      expect(mockPostHogCapture).toHaveBeenCalledWith('journal_submitted', {
        week_number: 12,
        content_length: 500,
        app_version: '1.0.0',
      });
    });

    it('should capture settings event', () => {
      trackEvent('locale_changed', {
        from_locale: 'en',
        to_locale: 'ko',
        app_version: '1.0.0',
      });

      expect(mockPostHogCapture).toHaveBeenCalledWith('locale_changed', {
        from_locale: 'en',
        to_locale: 'ko',
        app_version: '1.0.0',
      });
    });

    it('should handle empty properties', () => {
      trackEvent('screen_viewed', {
        app_version: '1.0.0',
      });

      expect(mockPostHogCapture).toHaveBeenCalled();
    });
  });

  describe('identifyUser', () => {
    it('should identify user with properties', () => {
      const userId = 'user-123';
      const properties = {
        tenant_count: 3,
        primary_role: 'admin' as const,
        locale: 'en' as const,
        created_at: '2024-01-01T00:00:00Z',
      };

      identifyUser(userId, properties);

      expect(mockPostHogIdentify).toHaveBeenCalledWith(userId, {
        tenant_count: 3,
        primary_role: 'admin',
        locale: 'en',
        created_at: '2024-01-01T00:00:00Z',
      });
    });

    it('should identify user with optional fields', () => {
      const userId = 'user-123';
      const properties = {
        tenant_count: 1,
        primary_role: 'member' as const,
        locale: 'ko' as const,
        created_at: '2024-01-01T00:00:00Z',
        email: 'test@example.com',
        display_name: 'Test User',
      };

      identifyUser(userId, properties);

      expect(mockPostHogIdentify).toHaveBeenCalledWith(userId, expect.objectContaining({
        email: 'test@example.com',
        display_name: 'Test User',
      }));
    });
  });

  describe('resetUser', () => {
    it('should reset user on logout', () => {
      resetUser();

      expect(mockPostHogReset).toHaveBeenCalled();
    });
  });

  describe('setGroup', () => {
    it('should set tenant group with properties', () => {
      const groupType = 'tenant';
      const groupKey = 'tenant-123';
      const properties = {
        name: 'Test Church',
        member_count: 150,
        created_at: '2024-01-01T00:00:00Z',
      };

      setGroup(groupType, groupKey, properties);

      expect(mockPostHogGroup).toHaveBeenCalledWith(groupType, groupKey, {
        name: 'Test Church',
        member_count: 150,
        created_at: '2024-01-01T00:00:00Z',
      });
    });
  });
});
