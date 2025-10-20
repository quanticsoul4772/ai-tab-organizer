import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  calculateBackoff,
  retryWithBackoff,
  retryWithValidation,
  isRetryableHttpError,
  isRetryableError,
  RetryableError,
} from '../retry';

describe('calculateBackoff', () => {
  it('calculates exponential backoff', () => {
    const delay0 = calculateBackoff(0, 1000, 30000, 0); // No jitter for predictability
    const delay1 = calculateBackoff(1, 1000, 30000, 0);
    const delay2 = calculateBackoff(2, 1000, 30000, 0);

    expect(delay0).toBe(1000); // 1000 * 2^0 = 1000
    expect(delay1).toBe(2000); // 1000 * 2^1 = 2000
    expect(delay2).toBe(4000); // 1000 * 2^2 = 4000
  });

  it('caps delay at maxDelay', () => {
    const delay = calculateBackoff(10, 1000, 5000, 0);
    expect(delay).toBeLessThanOrEqual(5000);
  });

  it('applies jitter within expected range', () => {
    const delays = Array.from({ length: 100 }, () => calculateBackoff(0, 1000, 30000, 30));

    // With 30% jitter, delays should be between 700 and 1300
    delays.forEach((delay) => {
      expect(delay).toBeGreaterThanOrEqual(700);
      expect(delay).toBeLessThanOrEqual(1300);
    });
  });

  it('never returns negative delay', () => {
    const delay = calculateBackoff(0, 100, 10000, 100); // 100% jitter
    expect(delay).toBeGreaterThanOrEqual(0);
  });

  it('uses default parameters', () => {
    const delay = calculateBackoff(0);
    expect(delay).toBeGreaterThan(0);
  });
});

describe('RetryableError', () => {
  it('creates error with message', () => {
    const error = new RetryableError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('RetryableError');
  });

  it('stores original error', () => {
    const original = new Error('Original');
    const error = new RetryableError('Wrapper', original);
    expect(error.originalError).toBe(original);
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const promise = retryWithBackoff(fn, { maxRetries: 3 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws RetryableError after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'));

    const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelay: 100 });

    // Attach error handler before running timers
    let error: unknown;
    const errorPromise = promise.catch((e) => {
      error = e;
    });

    await vi.runAllTimersAsync();
    await errorPromise;

    expect(error).toBeInstanceOf(RetryableError);
    expect((error as Error).message).toContain('Failed after 3 attempts');
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('calls onRetry callback on each retry', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success');
    const onRetry = vi.fn();

    const promise = retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelay: 100,
      onRetry,
    });

    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 2);
  });

  it('handles non-Error rejections', async () => {
    const fn = vi.fn().mockRejectedValue('string error');

    const promise = retryWithBackoff(fn, { maxRetries: 0, initialDelay: 100 });

    // Attach error handler before running timers
    let error: unknown;
    const errorPromise = promise.catch((e) => {
      error = e;
    });

    await vi.runAllTimersAsync();
    await errorPromise;

    expect(error).toBeInstanceOf(RetryableError);
  });

  it('times out when timeout is specified', async () => {
    const fn = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('success'), 5000);
        })
    );

    const promise = retryWithBackoff(fn, {
      maxRetries: 0,
      timeout: 1000,
    });

    // Attach error handler before running timers
    let error: unknown;
    const errorPromise = promise.catch((e) => {
      error = e;
    });

    await vi.runAllTimersAsync();
    await errorPromise;

    expect((error as Error).message).toContain('Operation timed out after 1000ms');
  });

  it('succeeds within timeout', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const promise = retryWithBackoff(fn, {
      maxRetries: 0,
      timeout: 1000,
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
  });

  it('respects maxRetries of 0', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    const promise = retryWithBackoff(fn, { maxRetries: 0 });

    // Attach error handler before running timers
    let error: unknown;
    const errorPromise = promise.catch((e) => {
      error = e;
    });

    await vi.runAllTimersAsync();
    await errorPromise;

    expect((error as Error).message).toContain('Failed after 1 attempts');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses default options', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const promise = retryWithBackoff(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
  });
});

describe('retryWithValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('validates successful result', async () => {
    const fn = vi.fn().mockResolvedValue({ name: 'John', age: 30 });
    const schema = z.object({ name: z.string(), age: z.number() });

    const promise = retryWithValidation(fn, schema, { maxRetries: 2 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('throws validation error on invalid result', async () => {
    const fn = vi.fn().mockResolvedValue({ name: 'John', age: 'invalid' });
    const schema = z.object({ name: z.string(), age: z.number() });

    const promise = retryWithValidation(fn, schema, { maxRetries: 2 });

    // Attach error handler before running timers
    let error: unknown;
    const errorPromise = promise.catch((e) => {
      error = e;
    });

    await vi.runAllTimersAsync();
    await errorPromise;

    expect((error as Error).message).toContain('Validation failed');
  });

  it('throws validation error with field details', async () => {
    const fn = vi.fn().mockResolvedValue({ name: 123 });
    const schema = z.object({ name: z.string() });

    const promise = retryWithValidation(fn, schema, { maxRetries: 0 });

    // Attach error handler before running timers
    let error: unknown;
    const errorPromise = promise.catch((e) => {
      error = e;
    });

    await vi.runAllTimersAsync();
    await errorPromise;

    expect((error as Error).message).toContain('name');
  });

  it('retries and validates on eventual success', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValue({ value: 42 });
    const schema = z.object({ value: z.number() });

    const promise = retryWithValidation(fn, schema, { maxRetries: 2, initialDelay: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ value: 42 });
  });
});

describe('isRetryableHttpError', () => {
  it('returns true for 429 rate limit', () => {
    expect(isRetryableHttpError(429)).toBe(true);
  });

  it('returns true for 500 server errors', () => {
    expect(isRetryableHttpError(500)).toBe(true);
    expect(isRetryableHttpError(502)).toBe(true);
    expect(isRetryableHttpError(503)).toBe(true);
    expect(isRetryableHttpError(504)).toBe(true);
  });

  it('returns true for any 5xx error', () => {
    expect(isRetryableHttpError(550)).toBe(true);
    expect(isRetryableHttpError(599)).toBe(true);
  });

  it('returns false for 4xx client errors', () => {
    expect(isRetryableHttpError(400)).toBe(false);
    expect(isRetryableHttpError(401)).toBe(false);
    expect(isRetryableHttpError(403)).toBe(false);
    expect(isRetryableHttpError(404)).toBe(false);
  });

  it('returns false for 2xx success', () => {
    expect(isRetryableHttpError(200)).toBe(false);
    expect(isRetryableHttpError(201)).toBe(false);
  });

  it('returns false for 3xx redirects', () => {
    expect(isRetryableHttpError(301)).toBe(false);
    expect(isRetryableHttpError(302)).toBe(false);
  });
});

describe('isRetryableError', () => {
  it('returns true for RetryableError', () => {
    const error = new RetryableError('Test');
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for network errors', () => {
    expect(isRetryableError(new Error('fetch failed'))).toBe(true);
    expect(isRetryableError(new Error('network error'))).toBe(true);
    expect(isRetryableError(new Error('timeout occurred'))).toBe(true);
    expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
    expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
  });

  it('returns false for non-retryable errors', () => {
    expect(isRetryableError(new Error('Validation failed'))).toBe(false);
    expect(isRetryableError(new Error('Not found'))).toBe(false);
  });

  it('returns false for non-Error objects', () => {
    expect(isRetryableError('string error')).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
    expect(isRetryableError(123)).toBe(false);
  });
});
