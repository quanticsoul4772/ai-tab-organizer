import * as Sentry from '@sentry/browser';
import { retryWithValidation, type RetryOptions } from '@utils/retry';
import { z } from 'zod';

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not set - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV || 'production',
    beforeSend(event) {
      // Remove sensitive data
      if (event.request?.headers) {
        delete event.request.headers['x-api-key'];
      }
      return event;
    },
  });
}

export async function tracedRetryWithValidation<T extends z.ZodTypeAny>(
  operation: string,
  fn: () => Promise<unknown>,
  schema: T,
  options: RetryOptions = {}
): Promise<z.infer<T>> {
  return Sentry.startSpan({ op: 'retry.validation', name: operation }, async (span) => {
    try {
      const result = await retryWithValidation(fn, schema, options);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({ code: 2 }); // ERROR
      Sentry.captureException(error, {
        contexts: {
          retry: {
            operation,
            maxRetries: options.maxRetries,
          },
        },
      });
      throw error;
    }
  });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error(error, context);
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}
