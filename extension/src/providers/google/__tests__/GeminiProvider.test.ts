/**
 * Tests for GeminiProvider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiProvider } from '../GeminiProvider';
import { AIProvider, ProviderConfig, UnifiedRequest } from '../../base/types';

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let mockConfig: ProviderConfig;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'AIzatest-key',
      model: 'gemini-1.5-pro',
      maxTokens: 1024,
      timeout: 30000,
      maxRetries: 2,
    };
    provider = new GeminiProvider(mockConfig);

    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configuration', () => {
    it('should have correct provider type', () => {
      expect(provider.provider).toBe(AIProvider.GOOGLE);
    });

    it('should have API key in URL', () => {
      expect(provider.baseUrl).toContain('key=AIzatest-key');
      expect(provider.baseUrl).toContain('gemini-1.5-pro');
      expect(provider.baseUrl).toContain('generativelanguage.googleapis.com');
    });

    it('should have minimal headers (no auth header)', () => {
      const headers = provider.headers;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('transformRequest', () => {
    it('should transform basic request', () => {
      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
      };

      const transformed = provider.transformRequest(request) as Record<string, unknown>;

      expect(Array.isArray(transformed.contents)).toBe(true);
      const contents = transformed.contents as Array<Record<string, unknown>>;
      expect(contents.length).toBe(1);
      expect(contents[0].role).toBe('user');

      const generationConfig = transformed.generationConfig as Record<string, unknown>;
      expect(generationConfig.maxOutputTokens).toBe(100);
      expect(generationConfig.temperature).toBe(0.7);
    });

    it('should convert assistant role to model', () => {
      const request: UnifiedRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi!' },
          { role: 'user', content: 'How are you?' },
        ],
        maxTokens: 100,
      };

      const transformed = provider.transformRequest(request) as Record<string, unknown>;
      const contents = transformed.contents as Array<Record<string, unknown>>;

      expect(contents[0].role).toBe('user');
      expect(contents[1].role).toBe('model'); // assistant -> model
      expect(contents[2].role).toBe('user');
    });

    it('should separate system message as systemInstruction', () => {
      const request: UnifiedRequest = {
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ],
        maxTokens: 100,
      };

      const transformed = provider.transformRequest(request) as Record<string, unknown>;

      expect(transformed.systemInstruction).toBeDefined();
      const systemInstruction = transformed.systemInstruction as Record<string, unknown>;
      const parts = systemInstruction.parts as Array<Record<string, string>>;
      expect(parts[0].text).toBe('You are helpful');

      const contents = transformed.contents as Array<unknown>;
      expect(contents.length).toBe(1); // System message not in contents
    });

    it('should use custom temperature', () => {
      const request: UnifiedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
        temperature: 0.3,
      };

      const transformed = provider.transformRequest(request) as Record<string, unknown>;
      const generationConfig = transformed.generationConfig as Record<string, unknown>;

      expect(generationConfig.temperature).toBe(0.3);
    });
  });

  describe('transformResponse', () => {
    it('should transform valid response', () => {
      const geminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Hello! I am Gemini, how can I help you?',
                },
              ],
              role: 'model',
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 8,
          candidatesTokenCount: 15,
          totalTokenCount: 23,
        },
      };

      const transformed = provider.transformResponse(geminiResponse);

      expect(transformed.content).toBe('Hello! I am Gemini, how can I help you?');
      expect(transformed.usage.inputTokens).toBe(8);
      expect(transformed.usage.outputTokens).toBe(15);
      expect(transformed.usage.totalTokens).toBe(23);
      expect(transformed.model).toBe('gemini-1.5-pro');
      expect(transformed.provider).toBe(AIProvider.GOOGLE);
    });

    it('should handle multiple parts', () => {
      const geminiResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Part 1. ' }, { text: 'Part 2.' }],
              role: 'model',
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 8,
          candidatesTokenCount: 15,
          totalTokenCount: 23,
        },
      };

      const transformed = provider.transformResponse(geminiResponse);

      expect(transformed.content).toBe('Part 1. \nPart 2.');
    });
  });

  describe('validateResponse', () => {
    it('should validate correct response', () => {
      const response = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(true);
    });

    it('should reject response without candidates', () => {
      const response = {
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(false);
    });

    it('should reject response with empty candidates', () => {
      const response = {
        candidates: [],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(false);
    });

    it('should reject response without content', () => {
      const response = {
        candidates: [{}],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(false);
    });

    it('should reject response without parts', () => {
      const response = {
        candidates: [
          {
            content: {},
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
        },
      };

      expect(provider.validateResponse(response)).toBe(false);
    });

    it('should reject response without usage metadata', () => {
      const response = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello' }],
            },
          },
        ],
      };

      expect(provider.validateResponse(response)).toBe(false);
    });
  });

  describe('complete', () => {
    it('should make successful API call', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Test response from Gemini',
                },
              ],
              role: 'model',
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 10,
          totalTokenCount: 15,
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

      expect(result.content).toBe('Test response from Gemini');
      expect(result.usage.inputTokens).toBe(5);
      expect(result.usage.outputTokens).toBe(10);
      expect(result.provider).toBe(AIProvider.GOOGLE);
    });
  });
});
