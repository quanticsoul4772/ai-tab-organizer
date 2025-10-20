/**
 * Tests for BaseProvider abstract class
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseProvider } from '../BaseProvider';
import {
  AIProvider,
  ProviderConfig,
  UnifiedRequest,
  UnifiedResponse,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  ProviderError,
} from '../types';

// Mock provider for testing
class MockProvider extends BaseProvider {
  get provider(): AIProvider {
    return AIProvider.ANTHROPIC;
  }

  get baseUrl(): string {
    return 'https://api.mock.com/v1/messages';
  }

  get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
    };
  }

  transformRequest(request: UnifiedRequest): unknown {
    return {
      model: this.config.model,
      max_tokens: request.maxTokens,
      messages: request.messages,
    };
  }

  transformResponse(response: unknown): UnifiedResponse {
    const data = response as { content: string; usage: { input: number; output: number } };
    return {
      content: data.content,
      usage: {
        inputTokens: data.usage.input,
        outputTokens: data.usage.output,
        totalTokens: data.usage.input + data.usage.output,
      },
      model: this.config.model,
      provider: this.provider,
    };
  }

  validateResponse(response: unknown): boolean {
    const data = response as Record<string, unknown>;
    return !!(data.content && data.usage);
  }
}

describe('BaseProvider', () => {
  let mockConfig: ProviderConfig;
  let provider: MockProvider;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'test-key',
      model: 'test-model',
      maxTokens: 100,
      timeout: 5000,
      maxRetries: 2,
      initialRetryDelay: 100,
      retryJitter: 10,
    };
    provider = new MockProvider(mockConfig);

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with valid config', () => {
      expect(provider.provider).toBe(AIProvider.ANTHROPIC);
      expect(provider.displayName).toBe('Anthropic');
    });

    it('should throw error for missing API key', () => {
      const invalidConfig = { ...mockConfig, apiKey: '' };
      expect(() => new MockProvider(invalidConfig)).toThrow('API key is required');
    });

    it('should throw error for missing model', () => {
      const invalidConfig = { ...mockConfig, model: '' };
      expect(() => new MockProvider(invalidConfig)).toThrow('Model is required');
    });

    it('should throw error for invalid maxTokens', () => {
      const invalidConfig = { ...mockConfig, maxTokens: 0 };
      expect(() => new MockProvider(invalidConfig)).toThrow('maxTokens must be positive');
    });

    it('should throw error for invalid timeout', () => {
      const invalidConfig = { ...mockConfig, timeout: -1 };
      expect(() => new MockProvider(invalidConfig)).toThrow('timeout must be positive');
    });

    it('should throw error for invalid maxRetries', () => {
      const invalidConfig = { ...mockConfig, maxRetries: -1 };
      expect(() => new MockProvider(invalidConfig)).toThrow('maxRetries must be non-negative');
    });
  });

  describe('complete', () => {
    it('should successfully complete request', async () => {
      const mockResponse = {
        content: 'Test response',
        usage: { input: 10, output: 20 },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
      };

      const result = await provider.complete(request);

      expect(result.content).toBe('Test response');
      expect(result.usage.inputTokens).toBe(10);
      expect(result.usage.outputTokens).toBe(20);
      expect(result.usage.totalTokens).toBe(30);
      expect(result.provider).toBe(AIProvider.ANTHROPIC);
    });

    it('should handle validation errors', async () => {
      const invalidResponse = { invalid: 'data' };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      });

      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
      };

      await expect(provider.complete(request)).rejects.toThrow(ValidationError);
    });

    it('should handle authentication errors (401)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid API key' }),
      });

      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
      };

      await expect(provider.complete(request)).rejects.toThrow(AuthenticationError);
    });

    it('should handle rate limit errors (429) and retry', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ error: 'Rate limited' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: 'Success after retry',
            usage: { input: 5, output: 10 },
          }),
        });

      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
      };

      const result = await provider.complete(request);
      expect(result.content).toBe('Success after retry');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on server errors (5xx)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: 'Success after retry',
            usage: { input: 5, output: 10 },
          }),
        });

      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
      };

      const result = await provider.complete(request);
      expect(result.content).toBe('Success after retry');
    });

    it('should not retry on client errors (4xx except 429)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request' }),
      });

      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
      };

      await expect(provider.complete(request)).rejects.toThrow(ProviderError);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries limit', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
      };

      await expect(provider.complete(request)).rejects.toThrow();
      // Should call: initial + 2 retries = 3 times
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('handleError', () => {
    it('should throw AuthenticationError for 401', () => {
      expect(() => provider.handleError('Unauthorized', 401)).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for 403', () => {
      expect(() => provider.handleError('Forbidden', 403)).toThrow(AuthenticationError);
    });

    it('should throw RateLimitError for 429', () => {
      expect(() => provider.handleError('Rate limited', 429)).toThrow(RateLimitError);
    });

    it('should throw retryable ProviderError for 5xx', () => {
      try {
        provider.handleError('Server error', 500);
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).retryable).toBe(true);
      }
    });

    it('should throw non-retryable ProviderError for 4xx', () => {
      try {
        provider.handleError('Bad request', 400);
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).retryable).toBe(false);
      }
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract error from error field', () => {
      const errorData = { error: 'Test error message' };
      const message = (provider as any).extractErrorMessage(errorData);
      expect(message).toBe('Test error message');
    });

    it('should extract error from message field', () => {
      const errorData = { message: 'Test message' };
      const message = (provider as any).extractErrorMessage(errorData);
      expect(message).toBe('Test message');
    });

    it('should extract error from nested error object', () => {
      const errorData = { error: { message: 'Nested error' } };
      const message = (provider as any).extractErrorMessage(errorData);
      expect(message).toBe('Nested error');
    });

    it('should return null for invalid data', () => {
      const message = (provider as any).extractErrorMessage('not an object');
      expect(message).toBeNull();
    });
  });

  describe('displayName', () => {
    it('should return correct display name for Anthropic', () => {
      expect(provider.displayName).toBe('Anthropic');
    });

    it('should return correct display name for OpenAI', () => {
      class OpenAIProvider extends MockProvider {
        get provider(): AIProvider {
          return AIProvider.OPENAI;
        }
      }
      const openaiProvider = new OpenAIProvider(mockConfig);
      expect(openaiProvider.displayName).toBe('OpenAI');
    });

    it('should return correct display name for Google', () => {
      class GoogleProvider extends MockProvider {
        get provider(): AIProvider {
          return AIProvider.GOOGLE;
        }
      }
      const googleProvider = new GoogleProvider(mockConfig);
      expect(googleProvider.displayName).toBe('Google');
    });
  });
});
