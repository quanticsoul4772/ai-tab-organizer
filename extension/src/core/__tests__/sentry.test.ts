import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/browser';
import { z } from 'zod';
import { initSentry, captureError, tracedRetryWithValidation } from '../sentry';

vi.mock('@sentry/browser', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  startSpan: vi.fn((options, callback) => callback({ setStatus: vi.fn() })),
}));

vi.mock('@utils/retry', () => ({
  retryWithValidation: vi.fn((fn, schema) => fn().then((data) => schema.parse(data))),
}));

describe('Sentry Integration', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalDsn = process.env.SENTRY_DSN;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.SENTRY_DSN = originalDsn;
  });

  describe('initSentry()', () => {
    it('initializes when DSN is set', () => {
      process.env.SENTRY_DSN = 'https://example@sentry.io/123';

      initSentry();

      expect(Sentry.init).toHaveBeenCalled();
    });

    it('does not initialize when DSN is missing', () => {
      process.env.SENTRY_DSN = '';
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      initSentry();

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('uses correct sample rate in production', () => {
      process.env.SENTRY_DSN = 'https://example@sentry.io/123';
      process.env.NODE_ENV = 'production';

      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0.1,
        })
      );
    });

    it('uses full sample rate in development', () => {
      process.env.SENTRY_DSN = 'https://example@sentry.io/123';
      process.env.NODE_ENV = 'development';

      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 1.0,
        })
      );
    });

    it('removes API key from headers', () => {
      process.env.SENTRY_DSN = 'https://example@sentry.io/123';

      initSentry();

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const event = {
        request: {
          headers: {
            'x-api-key': 'secret',
            'content-type': 'application/json',
          },
        },
      };

      const result = beforeSend?.(event as any);

      expect(result?.request?.headers).not.toHaveProperty('x-api-key');
    });
  });

  describe('captureError()', () => {
    it('logs error to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test');

      captureError(error);

      expect(consoleSpy).toHaveBeenCalledWith(error, undefined);

      consoleSpy.mockRestore();
    });

    it('captures to Sentry', () => {
      const error = new Error('Test');

      captureError(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          contexts: expect.any(Object),
        })
      );
    });

    it('includes context', () => {
      const error = new Error('Test');
      const context = { key: 'value' };

      captureError(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          contexts: {
            custom: context,
          },
        })
      );
    });
  });

  describe('tracedRetryWithValidation()', () => {
    it('calls startSpan with correct operation name', async () => {
      const fn = vi.fn().mockResolvedValue({ name: 'test' });
      const schema = z.object({ name: z.string() });

      await tracedRetryWithValidation('test-operation', fn, schema);

      expect(Sentry.startSpan).toHaveBeenCalledWith(
        {
          op: 'retry.validation',
          name: 'test-operation',
        },
        expect.any(Function)
      );
    });

    it('returns validated result on success', async () => {
      const fn = vi.fn().mockResolvedValue({ name: 'test', value: 42 });
      const schema = z.object({ name: z.string(), value: z.number() });

      const result = await tracedRetryWithValidation('test-op', fn, schema);

      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('sets span status to OK on success', async () => {
      const fn = vi.fn().mockResolvedValue({ name: 'test' });
      const schema = z.object({ name: z.string() });
      const setStatusMock = vi.fn();

      vi.mocked(Sentry.startSpan).mockImplementation((options, callback) =>
        callback({ setStatus: setStatusMock })
      );

      await tracedRetryWithValidation('test-op', fn, schema);

      expect(setStatusMock).toHaveBeenCalledWith({ code: 1 });
    });

    it('sets span status to ERROR on failure', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));
      const schema = z.object({ name: z.string() });
      const setStatusMock = vi.fn();

      vi.mocked(Sentry.startSpan).mockImplementation((options, callback) =>
        callback({ setStatus: setStatusMock })
      );

      await expect(tracedRetryWithValidation('test-op', fn, schema)).rejects.toThrow('Test error');

      expect(setStatusMock).toHaveBeenCalledWith({ code: 2 });
    });

    it('captures exception on error', async () => {
      const error = new Error('Test error');
      const fn = vi.fn().mockRejectedValue(error);
      const schema = z.object({ name: z.string() });

      await expect(
        tracedRetryWithValidation('test-op', fn, schema, { maxRetries: 2 })
      ).rejects.toThrow('Test error');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          contexts: {
            retry: {
              operation: 'test-op',
              maxRetries: 2,
            },
          },
        })
      );
    });

    it('passes retry options correctly', async () => {
      const fn = vi.fn().mockResolvedValue({ name: 'test' });
      const schema = z.object({ name: z.string() });

      await tracedRetryWithValidation('test-op', fn, schema, {
        maxRetries: 3,
        initialDelay: 500,
      });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('throws error on validation failure', async () => {
      const fn = vi.fn().mockResolvedValue({ name: 123 });
      const schema = z.object({ name: z.string() });

      await expect(tracedRetryWithValidation('test-op', fn, schema)).rejects.toThrow();
    });
  });
});
