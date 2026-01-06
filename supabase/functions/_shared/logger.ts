/**
 * Structured logging utilities for Supabase Edge Functions.
 *
 * This module provides JSON-structured logging with consistent formatting
 * for all Edge Functions, enabling proper log aggregation and analysis.
 *
 * @module _shared/logger
 */

/**
 * Log levels matching standard severity conventions.
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Standard log context fields.
 */
export interface LogContext {
  /** Edge Function name */
  function_name: string;
  /** Request ID for correlation */
  request_id?: string;
  /** Tenant ID for multi-tenant context */
  tenant_id?: string;
  /** User ID for user-scoped logs */
  user_id?: string;
  /** Additional contextual data */
  [key: string]: unknown;
}

/**
 * Structured log entry.
 */
export interface LogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Contextual data */
  context: LogContext;
  /** Error details (if applicable) */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  /** Duration in milliseconds (for performance tracking) */
  duration_ms?: number;
}

/**
 * Logger class for structured logging.
 */
export class Logger {
  private functionName: string;
  private requestId?: string;

  constructor(functionName: string, requestId?: string) {
    this.functionName = functionName;
    this.requestId = requestId;
  }

  /**
   * Create a base log entry with common fields.
   */
  private createEntry(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        function_name: this.functionName,
        ...(this.requestId && { request_id: this.requestId }),
        ...context,
      },
    };
  }

  /**
   * Output a log entry as JSON to console.
   */
  private output(entry: LogEntry): void {
    console.log(JSON.stringify(entry));
  }

  /**
   * Log a debug message.
   */
  debug(message: string, context?: LogContext): void {
    this.output(this.createEntry(LogLevel.DEBUG, message, context));
  }

  /**
   * Log an info message.
   */
  info(message: string, context?: LogContext): void {
    this.output(this.createEntry(LogLevel.INFO, message, context));
  }

  /**
   * Log a warning message.
   */
  warn(message: string, context?: LogContext): void {
    this.output(this.createEntry(LogLevel.WARN, message, context));
  }

  /**
   * Log an error message with error details.
   */
  error(message: string, error: unknown, context?: LogContext): void {
    const entry = this.createEntry(LogLevel.ERROR, message, context);

    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (typeof error === 'string') {
      entry.error = {
        name: 'Error',
        message: error,
      };
    } else if (error && typeof error === 'object') {
      entry.error = {
        name: (error as { name?: string }).name || 'Error',
        message: (error as { message?: string }).message || JSON.stringify(error),
      };
    }

    this.output(entry);
  }

  /**
   * Log a function entry (invocation start).
   */
  logEntry(context?: LogContext): void {
    this.info('Function invoked', context);
  }

  /**
   * Log a function exit (invocation completion).
   */
  logExit(context?: { duration_ms?: number } & LogContext): void {
    this.info('Function completed', context);
  }

  /**
   * Create a child logger with additional context.
   */
  child(additionalContext: LogContext): Logger {
    const child = new Logger(this.functionName, this.requestId);
    child.info = (message: string, context?: LogContext) => {
      this.output(
        this.createEntry(LogLevel.INFO, message, {
          ...additionalContext,
          ...context,
        }),
      );
    };
    return child;
  }
}

/**
 * Create a logger instance for an Edge Function.
 *
 * @param functionName - The name of the Edge Function
 * @param requestId - Optional request ID for correlation
 * @returns Logger instance
 *
 * @example
 * ```typescript
 * import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
 * import { createLogger, LogLevel } from '../_shared/logger.ts';
 *
 * const logger = createLogger('my-function');
 *
 * serve(async (req) => {
 *   const requestId = crypto.randomUUID();
 *   const requestLogger = new Logger('my-function', requestId);
 *
 *   requestLogger.logEntry({ user_id: '123' });
 *
 *   try {
 *     // ... function logic
 *     requestLogger.info('Processing completed', { records_processed: 10 });
 *     requestLogger.logExit({ duration_ms: 150 });
 *   } catch (error) {
 *     requestLogger.error('Processing failed', error, { user_id: '123' });
 *     throw error;
 *   }
 * });
 * ```
 */
export function createLogger(functionName: string, requestId?: string): Logger {
  return new Logger(functionName, requestId);
}

/**
 * Extract common request context from a Request object.
 *
 * @param req - The Request object
 * @returns Log context with common request fields
 */
export function extractRequestContext(req: Request): Partial<LogContext> {
  const url = new URL(req.url);
  const context: Partial<LogContext> = {
    request_method: req.method,
    request_path: url.pathname,
    request_query: url.search,
    user_agent: req.headers.get('user-agent') || undefined,
  };

  // Extract tenant_id from header if present (for multi-tenant apps)
  const tenantId = req.headers.get('x-tenant-id');
  if (tenantId) {
    context.tenant_id = tenantId;
  }

  // Extract user_id from header if present
  const userId = req.headers.get('x-user-id');
  if (userId) {
    context.user_id = userId;
  }

  return context;
}

/**
 * Measure execution time of an async function.
 *
 * @param fn - Async function to measure
 * @param logger - Logger instance
 * @param context - Additional context to log
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * const result = await measureTime(
 *   async () => await processData(data),
 *   logger,
 *   { operation: 'process_data' }
 * );
 * ```
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
  logger: Logger,
  context?: LogContext,
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    logger.debug('Operation completed', {
      ...context,
      duration_ms: Math.round(duration),
    });
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('Operation failed', error, {
      ...context,
      duration_ms: Math.round(duration),
    });
    throw error;
  }
}

/**
 * Create a middleware-style request logger for Edge Functions.
 *
 * @param functionName - Name of the Edge Function
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
 * import { createRequestLogger } from '../_shared/logger.ts';
 *
 * const withLogging = createRequestLogger('my-function');
 *
 * serve(withLogging(async (req, logger) => {
 *   logger.info('Processing request');
 *   return new Response(JSON.stringify({ success: true }), {
 *     headers: { 'Content-Type': 'application/json' },
 *   });
 * }));
 * ```
 */
export function createRequestLogger(
  functionName: string,
): (
  handler: (req: Request, logger: Logger) => Promise<Response>,
) => (req: Request) => Promise<Response> {
  return (handler) => {
    return async (req: Request) => {
      const requestId = crypto.randomUUID();
      const logger = new Logger(functionName, requestId);

      const startTime = performance.now();
      logger.logEntry(extractRequestContext(req));

      try {
        const response = await handler(req, logger);

        const duration = performance.now() - startTime;
        logger.logExit({
          duration_ms: Math.round(duration),
          status_code: response.status,
        });

        // Add request ID to response headers
        response.headers.set('x-request-id', requestId);
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('Function failed', error, {
          duration_ms: Math.round(duration),
        });

        return new Response(
          JSON.stringify({
            error: 'Internal server error',
            request_id: requestId,
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'x-request-id': requestId,
            },
          },
        );
      }
    };
  };
}
