import { z } from 'zod';

/**
 * Retry options configuration
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  jitterPercent?: number;
  timeout?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Custom error for retryable failures
 */
export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'RetryableError';
  }
}

/**
 * Calculate exponential backoff delay with jitter
 * Jitter helps prevent thundering herd problem when multiple requests retry simultaneously
 *
 * @param attempt - Current retry attempt (0-indexed)
 * @param initialDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay cap in milliseconds
 * @param jitterPercent - Random jitter as percentage (0-100), default 30%
 * @returns Delay in milliseconds with jitter applied
 */
export function calculateBackoff(
  attempt: number,
  initialDelay: number = 1000,
  maxDelay: number = 30000,
  jitterPercent: number = 30
): number {
  // Exponential backoff: initialDelay * 2^attempt
  const exponentialDelay = initialDelay * Math.pow(2, attempt);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add random jitter: ±jitterPercent
  const jitterRange = cappedDelay * (jitterPercent / 100);
  const jitter = Math.random() * jitterRange * 2 - jitterRange;

  return Math.max(0, cappedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff and jitter
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws Error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetch('https://api.example.com'),
 *   {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *     jitterPercent: 30,
 *     onRetry: (err, attempt) => console.log(`Retry ${attempt}: ${err.message}`)
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    jitterPercent = 30,
    timeout,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout wrapper if timeout is specified
      if (timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const result = await Promise.race([
            fn(),
            new Promise<never>((_, reject) => {
              controller.signal.addEventListener('abort', () => {
                reject(new Error(`Operation timed out after ${timeout}ms`));
              });
            }),
          ]);
          clearTimeout(timeoutId);
          return result;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } else {
        return await fn();
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        break;
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }

      // Calculate delay with exponential backoff and jitter
      const delay = calculateBackoff(attempt, initialDelay, maxDelay, jitterPercent);

      // Wait before next retry
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw new RetryableError(
    `Failed after ${maxRetries + 1} attempts: ${lastError!.message}`,
    lastError!
  );
}

/**
 * Retry a function with Zod schema validation
 * Combines retry logic with runtime type checking
 *
 * @param fn - Async function to retry
 * @param schema - Zod schema to validate the result
 * @param options - Retry configuration options
 * @returns Promise resolving to the validated result
 * @throws Error if validation fails or retries are exhausted
 *
 * @example
 * ```typescript
 * const response = await retryWithValidation(
 *   () => fetch('https://api.example.com').then(r => r.json()),
 *   z.object({ data: z.string() }),
 *   { maxRetries: 2 }
 * );
 * ```
 */
export async function retryWithValidation<T extends z.ZodTypeAny>(
  fn: () => Promise<unknown>,
  schema: T,
  options: RetryOptions = {}
): Promise<z.infer<T>> {
  const result = await retryWithBackoff(fn, options);

  // Validate result with Zod schema
  try {
    return schema.parse(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation failed: ${error.errors.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    throw error;
  }
}

/**
 * Determine if an HTTP error is retryable
 * Retryable: 429 (rate limit), 500, 502, 503, 504
 * Not retryable: 400, 401, 403, 404
 */
export function isRetryableHttpError(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * Determine if an error is retryable based on error type
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof RetryableError) {
    return true;
  }

  if (error instanceof Error) {
    // Network errors
    if (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT')
    ) {
      return true;
    }
  }

  return false;
}
