/**
 * Tests for AnthropicProvider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicProvider } from '../AnthropicProvider';
import { AIProvider, ProviderConfig, UnifiedRequest } from '../../base/types';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockConfig: ProviderConfig;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'sk-ant-test-key',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1024,
      timeout: 30000,
      maxRetries: 2,
    };
    provider = new AnthropicProvider(mockConfig);

    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configuration', () => {
    it('should have correct provider type', () => {
      expect(provider.provider).toBe(AIProvider.ANTHROPIC);
    });

    it('should have correct base URL', () => {
      expect(provider.baseUrl).toBe('https://api.anthropic.com/v1/messages');
    });

    it('should have correct headers', () => {
      const headers = provider.headers;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['x-api-key']).toBe('sk-ant-test-key');
      expect(headers['anthropic-version']).toBe('2023-06-01');
      expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    });
  });

  describe('transformRequest', () => {
    it('should transform basic request', () => {
      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
      };

      const transformed = provider.transformRequest(request) as Record<string, unknown>;

      expect(transformed.model).toBe('claude-3-5-sonnet-20241022');
      expect(transformed.max_tokens).toBe(100);
      expect(Array.isArray(transformed.messages)).toBe(true);
      expect((transformed.messages as Array<unknown>).length).toBe(1);
    });

    it('should separate system message', () => {
      const request: UnifiedRequest = {
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ],
        maxTokens: 100,
      };

      const transformed = provider.transformRequest(request) as Record<string, unknown>;

      expect(transformed.system).toBe('You are helpful');
      expect(Array.isArray(transformed.messages)).toBe(true);
      expect((transformed.messages as Array<unknown>).length).toBe(1);
    });

    it('should add temperature if specified', () => {
      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
        temperature: 0.5,
      };

      const transformed = provider.transformRequest(request) as Record<string, unknown>;

      expect(transformed.temperature).toBe(0.5);
    });

    it('should throw if first message is not from user', () => {
      const request: UnifiedRequest = {
        messages: [{ role: 'assistant', content: 'Hello' }],
        maxTokens: 100,
      };

      expect(() => provider.transformRequest(request)).toThrow(
        'Anthropic requires first message to be from user'
      );
    });
  });

  describe('transformResponse', () => {
    it('should transform valid response', () => {
      const anthropicResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello! How can I help?' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      const transformed = provider.transformResponse(anthropicResponse);

      expect(transformed.content).toBe('Hello! How can I help?');
      expect(transformed.usage.inputTokens).toBe(10);
      expect(transformed.usage.outputTokens).toBe(20);
      expect(transformed.usage.totalTokens).toBe(30);
      expect(transformed.model).toBe('claude-3-5-sonnet-20241022');
      expect(transformed.provider).toBe(AIProvider.ANTHROPIC);
    });

    it('should handle multiple content blocks', () => {
      const anthropicResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'First part. ' },
          { type: 'text', text: 'Second part.' },
        ],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      const transformed = provider.transformResponse(anthropicResponse);

      expect(transformed.content).toBe('First part. \nSecond part.');
    });
  });

  describe('validateResponse', () => {
    it('should validate correct response', () => {
      const response = {
        content: [{ type: 'text', text: 'Hello' }],
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(true);
    });

    it('should reject response without content', () => {
      const response = {
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(false);
    });

    it('should reject response without usage', () => {
      const response = {
        content: [{ type: 'text', text: 'Hello' }],
      };

      expect(provider.validateResponse(response)).toBe(false);
    });

    it('should reject response with empty content array', () => {
      const response = {
        content: [],
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(false);
    });

    it('should reject response without text content', () => {
      const response = {
        content: [{ type: 'image', data: 'base64...' }],
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(false);
    });
  });

  describe('complete', () => {
    it('should make successful API call', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Test response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 15,
          output_tokens: 25,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        maxTokens: 100,
      };

      const result = await provider.complete(request);

      expect(result.content).toBe('Test response');
      expect(result.usage.inputTokens).toBe(15);
      expect(result.usage.outputTokens).toBe(25);
      expect(result.provider).toBe(AIProvider.ANTHROPIC);
    });
  });
});
