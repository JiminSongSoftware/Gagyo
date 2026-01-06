/**
 * Unit tests for Sentry integration.
 *
 * These tests verify that Sentry initialization, error capture, user context,
 * and breadcrumbs work correctly.
 */

import { captureError, captureMessage, setUserContext, clearUserContext, addBreadcrumb, setTags, initSentry } from '../sentry';
import * as Sentry from '@sentry/react-native';

// Mock Sentry SDK
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTags: jest.fn(),
  addBreadcrumb: jest.fn(),
  setContext: jest.fn(),
  configureScope: jest.fn((callback) => {
    const scope = {
      setTag: jest.fn(),
      setUser: jest.fn(),
      setContext: jest.fn(),
      addBreadcrumb: jest.fn(),
      clearBreadcrumbs: jest.fn(),
    };
    callback(scope);
  }),
}));

const mockCaptureException = jest.mocked(Sentry.captureException);
const mockCaptureMessage = jest.mocked(Sentry.captureMessage);
const mockInit = jest.mocked(Sentry.init);
const mockSetUser = jest.mocked(Sentry.setUser);
const mockSetTags = jest.mocked(Sentry.setTags);
const mockAddBreadcrumb = jest.mocked(Sentry.addBreadcrumb);
const mockSetContext = jest.mocked(Sentry.setContext);

describe('Sentry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.SENTRY_DSN = 'https://test@sentry.io/123';
    process.env.EXPO_PUBLIC_ENV = 'development';
  });

  describe('initSentry', () => {
    it('should initialize Sentry with correct config', () => {
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'production',
        release: '1.0.0',
        dist: '1',
        sampleRate: 1.0,
        tracesSampleRate: 0.25,
      });

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          environment: 'production',
          release: '1.0.0',
          dist: '1',
          sampleRate: 1.0,
          tracesSampleRate: 0.25,
        })
      );
    });

    it('should not initialize when DSN is empty', () => {
      initSentry({
        dsn: '',
        environment: 'production',
      });

      expect(mockInit).not.toHaveBeenCalled();
    });

    it('should use development environment when not specified', () => {
      initSentry({
        dsn: 'https://test@sentry.io/123',
      });

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'development',
        })
      );
    });

    it('should use appropriate sample rates based on environment', () => {
      // Production should have tracesSampleRate of 0.25
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'production',
      });

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0.25,
        })
      );

      jest.clearAllMocks();

      // Development should have tracesSampleRate of 1.0
      initSentry({
        dsn: 'https://test@sentry.io/123',
        environment: 'development',
      });

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 1.0,
        })
      );
    });
  });

  describe('captureError', () => {
    it('should capture exception with context', () => {
      const error = new Error('Test error');
      const context = {
        tenant_id: 'tenant-123',
        user_role: 'admin',
        locale: 'en',
      };

      const eventId = captureError(error, context);

      expect(mockCaptureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: context,
          contexts: expect.objectContaining({
            custom: context,
          }),
        })
      );
    });

    it('should capture error with default context when none provided', () => {
      const error = new Error('Test error');

      captureError(error);

      expect(mockCaptureException).toHaveBeenCalledWith(
        error,
        expect.any(Object)
      );
    });

    it('should capture error with level', () => {
      const error = new Error('Test error');

      captureError(error, {}, 'warning');

      expect(mockCaptureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'warning',
        })
      );
    });

    it('should handle null error gracefully', () => {
      expect(() => captureError(null as unknown as Error)).not.toThrow();
    });
  });

  describe('captureMessage', () => {
    it('should capture message with context', () => {
      const message = 'Test message';
      const context = {
        tenant_id: 'tenant-123',
      };

      captureMessage(message, context);

      expect(mockCaptureMessage).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          tags: context,
        })
      );
    });

    it('should capture message with level', () => {
      const message = 'Info message';

      captureMessage(message, {}, 'info');

      expect(mockCaptureMessage).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          level: 'info',
        })
      );
    });
  });

  describe('setUserContext', () => {
    it('should set user context with all fields', () => {
      const userId = 'user-123';
      const context = {
        id: userId,
        tenant_id: 'tenant-123',
        role: 'admin' as const,
        locale: 'en' as const,
        email: 'test@example.com',
        username: 'testuser',
      };

      setUserContext(userId, context);

      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: userId,
          tenant_id: 'tenant-123',
          role: 'admin',
          locale: 'en',
          email: 'test@example.com',
          username: 'testuser',
        })
      );
    });

    it('should set user with minimal fields', () => {
      setUserContext('user-123', {
        id: 'user-123',
      });

      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
        })
      );
    });
  });

  describe('clearUserContext', () => {
    it('should clear user context', () => {
      clearUserContext();

      expect(mockSetUser).toHaveBeenCalledWith(null);
    });
  });

  describe('setTags', () => {
    it('should set tags for filtering', () => {
      const tags = {
        tenant_id: 'tenant-123',
        user_role: 'admin',
        locale: 'en',
      };

      setTags(tags);

      expect(mockSetTags).toHaveBeenCalledWith(tags);
    });
  });

  describe('addBreadcrumb', () => {
    it('should add navigation breadcrumb', () => {
      addBreadcrumb({
        category: 'navigation',
        type: 'navigation',
        message: 'Navigated to chat screen',
        level: 'info',
        data: {
          from: 'home',
          to: 'chat',
        },
      });

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'navigation',
          type: 'navigation',
          message: 'Navigated to chat screen',
          level: 'info',
          data: {
            from: 'home',
            to: 'chat',
          },
        })
      );
    });

    it('should add user action breadcrumb', () => {
      addBreadcrumb({
        category: 'user',
        type: 'user',
        message: 'Clicked send message button',
        level: 'info',
      });

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'user',
          type: 'user',
          message: 'Clicked send message button',
        })
      );
    });

    it('should add HTTP request breadcrumb', () => {
      addBreadcrumb({
        category: 'http',
        type: 'http',
        message: 'GET /api/messages',
        level: 'info',
        data: {
          url: '/api/messages',
          method: 'GET',
          status_code: 200,
        },
      });

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'http',
          type: 'http',
          message: 'GET /api/messages',
        })
      );
    });
  });
});
