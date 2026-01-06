/**
 * Unit tests for Edge Function structured logger.
 *
 * These tests verify that the logger produces properly formatted
 * JSON log entries with correct structure and context.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock console.log
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

import {
  Logger,
  createLogger,
  LogLevel,
  extractRequestContext,
  measureTime,
  createRequestLogger,
} from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a logger with function name', () => {
      const logger = new Logger('test-function');
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create a logger with request ID', () => {
      const logger = new Logger('test-function', 'req-123');
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('debug', () => {
    it('should output a debug log entry', () => {
      const logger = new Logger('test-function', 'req-123');
      logger.debug('Debug message', { foo: 'bar' });

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const output = JSON.parse(mockConsoleLog.mock.calls[0][0] as string);

      expect(output).toMatchObject({
        timestamp: expect.any(String),
        level: LogLevel.DEBUG,
        message: 'Debug message',
        context: {
          function_name: 'test-function',
          request_id: 'req-123',
          foo: 'bar',
        },
      });
    });
  });

  describe('info', () => {
    it('should output an info log entry', () => {
      const logger = new Logger('test-function', 'req-123');
      logger.info('Info message', { count: 5 });

      const output = JSON.parse(mockConsoleLog.mock.calls[0][0] as string);

      expect(output).toMatchObject({
        level: LogLevel.INFO,
        message: 'Info message',
        context: expect.objectContaining({
          count: 5,
        }),
      });
    });
  });

  describe('warn', () => {
    it('should output a warning log entry', () => {
      const logger = new Logger('test-function');
      logger.warn('Warning message');

      const output = JSON.parse(mockConsoleLog.mock.calls[0][0] as string);

      expect(output).toMatchObject({
        level: LogLevel.WARN,
        message: 'Warning message',
      });
    });
  });

  describe('error', () => {
    it('should output an error log entry with Error object', () => {
      const logger = new Logger('test-function');
      const error = new Error('Test error');
      logger.error('Error occurred', error, { feature: 'chat' });

      const output = JSON.parse(mockConsoleLog.mock.calls[0][0] as string);

      expect(output).toMatchObject({
        level: LogLevel.ERROR,
        message: 'Error occurred',
        context: {
          function_name: 'test-function',
          feature: 'chat',
        },
        error: {
          name: 'Error',
          message: 'Test error',
          stack: expect.any(String),
        },
      });
    });

    it('should handle string errors', () => {
      const logger = new Logger('test-function');
      logger.error('Error occurred', 'String error');

      const output = JSON.parse(mockConsoleLog.mock.calls[0][0] as string);

      expect(output.error).toMatchObject({
        name: 'Error',
        message: 'String error',
      });
    });

    it('should handle object errors', () => {
      const logger = new Logger('test-function');
      logger.error('Error occurred', { name: 'CustomError', message: 'Custom message' });

      const output = JSON.parse(mockConsoleLog.mock.calls[0][0] as string);

      expect(output.error).toMatchObject({
        name: 'CustomError',
        message: 'Custom message',
      });
    });
  });

  describe('logEntry and logExit', () => {
    it('should log function entry', () => {
      const logger = new Logger('test-function');
      logger.logEntry({ tenant_id: 'tenant-123' });

      const output = JSON.parse(mockConsoleLog.mock.calls[0][0] as string);

      expect(output).toMatchObject({
        level: LogLevel.INFO,
        message: 'Function invoked',
        context: expect.objectContaining({
          tenant_id: 'tenant-123',
        }),
      });
    });

    it('should log function exit with duration', () => {
      const logger = new Logger('test-function');
      logger.logExit({ duration_ms: 150 });

      const output = JSON.parse(mockConsoleLog.mock.calls[0][0] as string);

      expect(output).toMatchObject({
        level: LogLevel.INFO,
        message: 'Function completed',
        context: expect.objectContaining({
          duration_ms: 150,
        }),
      });
    });
  });

  describe('child', () => {
    it('should create child logger with merged context', () => {
      const parent = new Logger('test-function', 'req-123');
      const child = parent.child({ tenant_id: 'tenant-456' });
      child.info('Child message');

      const output = JSON.parse(mockConsoleLog.mock.calls[0][0] as string);

      expect(output).toMatchObject({
        level: LogLevel.INFO,
        message: 'Child message',
        context: expect.objectContaining({
          tenant_id: 'tenant-456',
        }),
      });
    });
  });
});

describe('createLogger', () => {
  it('should create a new logger instance', () => {
    const logger = createLogger('my-function', 'req-abc');
    expect(logger).toBeInstanceOf(Logger);
  });
});

describe('extractRequestContext', () => {
  it('should extract context from Request object', () => {
    const req = new Request('https://example.com/api/test?foo=bar', {
      method: 'POST',
      headers: {
        'User-Agent': 'TestAgent/1.0',
        'x-tenant-id': 'tenant-123',
        'x-user-id': 'user-456',
      },
    });

    const context = extractRequestContext(req);

    expect(context).toMatchObject({
      request_method: 'POST',
      request_path: '/api/test',
      request_query: '?foo=bar',
      user_agent: 'TestAgent/1.0',
      tenant_id: 'tenant-123',
      user_id: 'user-456',
    });
  });

  it('should handle missing headers', () => {
    const req = new Request('https://example.com/api/test');

    const context = extractRequestContext(req);

    expect(context).toMatchObject({
      request_method: 'GET',
      request_path: '/api/test',
    });
    expect(context.tenant_id).toBeUndefined();
    expect(context.user_id).toBeUndefined();
  });
});

describe('measureTime', () => {
  it('should measure async function execution time', async () => {
    const logger = new Logger('test-function');

    const result = await measureTime(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'success';
      },
      logger,
      { operation: 'test' },
    );

    expect(result).toBe('success');

    const output = JSON.parse(mockConsoleLog.mock.calls[0][0] as string);
    expect(output).toMatchObject({
      level: LogLevel.DEBUG,
      message: 'Operation completed',
      context: expect.objectContaining({
        operation: 'test',
        duration_ms: expect.any(Number),
      }),
    });
  });

  it('should log errors with timing', async () => {
    const logger = new Logger('test-function');

    await expect(
      measureTime(
        async () => {
          throw new Error('Test error');
        },
        logger,
        { operation: 'failing' },
      ),
    ).rejects.toThrow('Test error');

    // Should have two logs: one for the error, one from catch
    expect(mockConsoleLog).toHaveBeenCalled();
  });
});

describe('createRequestLogger', () => {
  it('should create middleware that logs requests', async () => {
    const withLogging = createRequestLogger('middleware-test');

    const handler = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const wrappedHandler = withLogging(handler);
    const req = new Request('https://example.com/api/test');

    const response = await wrappedHandler(req);

    expect(handler).toHaveBeenCalledWith(req, expect.any(Logger));
    expect(response.headers.get('x-request-id')).toBeTruthy();

    // Check that logs were created
    expect(mockConsoleLog).toHaveBeenCalled();
  });

  it('should handle errors and return 500 response', async () => {
    const withLogging = createRequestLogger('middleware-test');

    const handler = jest.fn().mockRejectedValue(new Error('Handler error'));

    const wrappedHandler = withLogging(handler);
    const req = new Request('https://example.com/api/test');

    const response = await wrappedHandler(req);

    expect(response.status).toBe(500);
    expect(response.headers.get('x-request-id')).toBeTruthy();

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'Internal server error',
      request_id: expect.any(String),
    });
  });
});
