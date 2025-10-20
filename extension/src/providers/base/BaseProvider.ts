/**
 * Abstract base class for AI providers
 * Implements common functionality and defines interface for provider-specific implementations
 */

import {
  AIProvider,
  AuthenticationError,
  IProvider,
  ProviderConfig,
  ProviderError,
  RateLimitError,
  UnifiedRequest,
  UnifiedResponse,
  ValidationError,
} from './types';

export abstract class BaseProvider implements IProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.validateConfig(config);
  }

  /**
   * Provider identifier (must be implemented by subclass)
   */
  abstract get provider(): AIProvider;

  /**
   * Base API URL (must be implemented by subclass)
   */
  abstract get baseUrl(): string;

  /**
   * HTTP headers for API requests (must be implemented by subclass)
   */
  abstract get headers(): Record<string, string>;

  /**
   * Transform unified request to provider-specific format
   * @param request - Unified request format
   * @returns Provider-specific request object
   */
  abstract transformRequest(request: UnifiedRequest): unknown;

  /**
   * Transform provider response to unified format
   * @param response - Provider-specific response object
   * @returns Unified response format
   */
  abstract transformResponse(response: unknown): UnifiedResponse;

  /**
   * Validate provider response structure
   * @param response - Response to validate
   * @returns True if valid, false otherwise
   */
  abstract validateResponse(response: unknown): boolean;

  /**
   * Make API call and return unified response with retry logic
   * @param request - Unified request format
   * @returns Promise resolving to unified response
   */
  async complete(request: UnifiedRequest): Promise<UnifiedResponse> {
    const maxRetries = this.config.maxRetries || 3;
    const initialDelay = this.config.initialRetryDelay || 1000;
    const jitterPercent = this.config.retryJitter || 30;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Calculate exponential backoff with jitter
          const baseDelay = initialDelay * Math.pow(2, attempt - 1);
          const jitter = baseDelay * (jitterPercent / 100) * Math.random();
          const delay = baseDelay + jitter;

          console.log(
            `🔄 Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms for ${this.provider}`
          );
          await this.sleep(delay);
        }

        return await this.makeRequest(request);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on authentication errors
        if (error instanceof AuthenticationError) {
          throw error;
        }

        // Don't retry on validation errors
        if (error instanceof ValidationError) {
          throw error;
        }

        // Retry on rate limit and retryable errors
        if (error instanceof ProviderError && error.retryable && attempt < maxRetries) {
          console.warn(`Retryable error on attempt ${attempt + 1}:`, error.message);
          continue;
        }

        // Don't retry on non-retryable errors
        if (error instanceof ProviderError && !error.retryable) {
          throw error;
        }

        // For unknown errors, retry if we have attempts left
        if (attempt < maxRetries) {
          console.warn(`Unknown error on attempt ${attempt + 1}, retrying:`, error);
          continue;
        }

        // Out of retries, throw the last error
        throw error;
      }
    }

    // Should never reach here, but TypeScript needs this
    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Make a single API request (without retry logic)
   * @param request - Unified request format
   * @returns Promise resolving to unified response
   */
  protected async makeRequest(request: UnifiedRequest): Promise<UnifiedResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Transform request to provider format
      const providerRequest = this.transformRequest(request);

      // Make API call
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(providerRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        await this.handleHttpError(response);
      }

      // Parse response
      const data = await response.json();

      // Validate response structure
      if (!this.validateResponse(data)) {
        throw new ValidationError('Invalid response structure from provider', this.provider, data);
      }

      // Transform to unified format
      return this.transformResponse(data);
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderError(
          `Request timeout after ${this.config.timeout}ms`,
          this.provider,
          undefined,
          true,
          error
        );
      }

      // Re-throw provider errors
      if (error instanceof ProviderError || error instanceof ValidationError) {
        throw error;
      }

      // Wrap unknown errors
      throw new ProviderError(
        `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        this.provider,
        undefined,
        false,
        error
      );
    }
  }

  /**
   * Handle HTTP error responses
   * @param response - Fetch response object
   */
  protected async handleHttpError(response: Response): Promise<never> {
    const statusCode = response.status;
    let errorMessage = `HTTP ${statusCode}`;

    try {
      const errorData = await response.json();
      errorMessage = this.extractErrorMessage(errorData) || errorMessage;
    } catch {
      // If JSON parsing fails, try to get text
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    this.handleError(errorMessage, statusCode);
  }

  /**
   * Extract error message from provider error response
   * @param errorData - Error response data
   * @returns Error message string
   */
  protected extractErrorMessage(errorData: unknown): string | null {
    if (!errorData || typeof errorData !== 'object') {
      return null;
    }

    const data = errorData as Record<string, unknown>;

    // Common error message fields
    const messageFields = ['error', 'message', 'error_message', 'detail', 'msg'];

    for (const field of messageFields) {
      if (field in data) {
        const value = data[field];

        // Handle nested error objects
        if (value && typeof value === 'object' && 'message' in value) {
          return String((value as { message: unknown }).message);
        }

        if (typeof value === 'string') {
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Handle provider-specific errors
   * @param error - Error message or object
   * @param statusCode - HTTP status code
   */
  handleError(error: unknown, statusCode?: number): never {
    const message = typeof error === 'string' ? error : String(error);

    // Authentication errors (401, 403)
    if (statusCode === 401 || statusCode === 403) {
      throw new AuthenticationError(this.provider, statusCode);
    }

    // Rate limit errors (429)
    if (statusCode === 429) {
      throw new RateLimitError(this.provider, undefined, statusCode);
    }

    // Server errors (5xx) - retryable
    if (statusCode && statusCode >= 500 && statusCode < 600) {
      throw new ProviderError(`Server error: ${message}`, this.provider, statusCode, true);
    }

    // Client errors (4xx) - not retryable (except 429 handled above)
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      throw new ProviderError(`Client error: ${message}`, this.provider, statusCode, false);
    }

    // Unknown errors - not retryable by default
    throw new ProviderError(message, this.provider, statusCode, false);
  }

  /**
   * Validate provider configuration
   * @param config - Configuration to validate
   */
  protected validateConfig(config: ProviderConfig): void {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error('API key is required');
    }

    if (!config.model || config.model.trim().length === 0) {
      throw new Error('Model is required');
    }

    if (config.maxTokens <= 0) {
      throw new Error('maxTokens must be positive');
    }

    if (config.timeout <= 0) {
      throw new Error('timeout must be positive');
    }

    if (config.maxRetries < 0) {
      throw new Error('maxRetries must be non-negative');
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get provider name for display
   */
  get displayName(): string {
    switch (this.provider) {
      case AIProvider.OPENAI:
        return 'OpenAI';
      case AIProvider.ANTHROPIC:
        return 'Anthropic';
      case AIProvider.GOOGLE:
        return 'Google';
      default:
        return this.provider;
    }
  }
}
