/**
 * Integration tests for background worker provider switching
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderFactory } from '../providers/base/ProviderFactory';
import { AIProvider, type ProviderConfig } from '../providers/base/types';

describe('Background Worker Provider Integration', () => {
  describe('Provider Configuration', () => {
    it('should create Anthropic provider with default model', () => {
      const config: ProviderConfig = {
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 1024,
        timeout: 30000,
        maxRetries: 3,
      };

      const provider = ProviderFactory.create(AIProvider.ANTHROPIC, config);

      expect(provider).toBeDefined();
      expect(provider.provider).toBe(AIProvider.ANTHROPIC);
    });

    it('should create OpenAI provider with default model', () => {
      const config: ProviderConfig = {
        apiKey: 'sk-test',
        model: 'gpt-4o',
        maxTokens: 1024,
        timeout: 30000,
        maxRetries: 3,
      };

      const provider = ProviderFactory.create(AIProvider.OPENAI, config);

      expect(provider).toBeDefined();
      expect(provider.provider).toBe(AIProvider.OPENAI);
    });

    it('should create Google provider with default model', () => {
      const config: ProviderConfig = {
        apiKey: 'AIzatest',
        model: 'gemini-1.5-pro',
        maxTokens: 1024,
        timeout: 30000,
        maxRetries: 3,
      };

      const provider = ProviderFactory.create(AIProvider.GOOGLE, config);

      expect(provider).toBeDefined();
      expect(provider.provider).toBe(AIProvider.GOOGLE);
    });

    it('should throw for invalid provider', () => {
      const config: ProviderConfig = {
        apiKey: 'test',
        model: 'test-model',
        maxTokens: 1024,
        timeout: 30000,
        maxRetries: 3,
      };

      expect(() => ProviderFactory.create('invalid' as AIProvider, config)).toThrow(
        'Unsupported provider: invalid'
      );
    });
  });

  describe('Provider Switching', () => {
    it('should switch between providers without errors', () => {
      const baseConfig = {
        maxTokens: 1024,
        timeout: 30000,
        maxRetries: 3,
      };

      // Anthropic
      const anthropicProvider = ProviderFactory.create(AIProvider.ANTHROPIC, {
        ...baseConfig,
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
      });
      expect(anthropicProvider.provider).toBe(AIProvider.ANTHROPIC);

      // OpenAI
      const openaiProvider = ProviderFactory.create(AIProvider.OPENAI, {
        ...baseConfig,
        apiKey: 'sk-test',
        model: 'gpt-4o',
      });
      expect(openaiProvider.provider).toBe(AIProvider.OPENAI);

      // Google
      const googleProvider = ProviderFactory.create(AIProvider.GOOGLE, {
        ...baseConfig,
        apiKey: 'AIzatest',
        model: 'gemini-1.5-pro',
      });
      expect(googleProvider.provider).toBe(AIProvider.GOOGLE);

      // All providers should be independent instances
      expect(anthropicProvider).not.toBe(openaiProvider);
      expect(openaiProvider).not.toBe(googleProvider);
      expect(googleProvider).not.toBe(anthropicProvider);
    });

    it('should support different models for the same provider', () => {
      const baseConfig = {
        apiKey: 'sk-ant-test',
        maxTokens: 1024,
        timeout: 30000,
        maxRetries: 3,
      };

      const sonnet = ProviderFactory.create(AIProvider.ANTHROPIC, {
        ...baseConfig,
        model: 'claude-3-5-sonnet-20241022',
      });

      const haiku = ProviderFactory.create(AIProvider.ANTHROPIC, {
        ...baseConfig,
        model: 'claude-3-5-haiku-20241022',
      });

      expect(sonnet.provider).toBe(AIProvider.ANTHROPIC);
      expect(haiku.provider).toBe(AIProvider.ANTHROPIC);
      expect(sonnet).not.toBe(haiku);
    });
  });

  describe('Backward Compatibility', () => {
    it('should default to Anthropic when provider not specified', () => {
      const provider = undefined;
      const model = undefined;

      // Simulate background.ts logic
      const selectedProvider = provider || AIProvider.ANTHROPIC;
      const defaultModel =
        selectedProvider === AIProvider.ANTHROPIC
          ? 'claude-3-5-sonnet-20241022'
          : selectedProvider === AIProvider.OPENAI
            ? 'gpt-4o'
            : selectedProvider === AIProvider.GOOGLE
              ? 'gemini-1.5-pro'
              : 'claude-3-5-sonnet-20241022';

      const selectedModel = model || defaultModel;

      expect(selectedProvider).toBe(AIProvider.ANTHROPIC);
      expect(selectedModel).toBe('claude-3-5-sonnet-20241022');
    });

    it('should preserve Anthropic provider for existing users', () => {
      // Simulate existing user with no provider settings
      const storedProvider = undefined;
      const storedModel = undefined;

      // Default behavior
      const provider = storedProvider || AIProvider.ANTHROPIC;
      const model = storedModel || 'claude-3-5-sonnet-20241022';

      expect(provider).toBe(AIProvider.ANTHROPIC);
      expect(model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should respect explicitly set provider and model', () => {
      // Simulate user who changed provider
      const storedProvider = AIProvider.OPENAI;
      const storedModel = 'gpt-4o-mini';

      const provider = storedProvider || AIProvider.ANTHROPIC;
      const model = storedModel || 'claude-3-5-sonnet-20241022';

      expect(provider).toBe(AIProvider.OPENAI);
      expect(model).toBe('gpt-4o-mini');
    });
  });

  describe('Request Format Compatibility', () => {
    it('should handle unified request format for all providers', () => {
      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
        maxTokens: 100,
      };

      const providers = [
        {
          provider: AIProvider.ANTHROPIC,
          apiKey: 'sk-ant-test',
          model: 'claude-3-5-sonnet-20241022',
        },
        { provider: AIProvider.OPENAI, apiKey: 'sk-test', model: 'gpt-4o' },
        { provider: AIProvider.GOOGLE, apiKey: 'AIzatest', model: 'gemini-1.5-pro' },
      ];

      providers.forEach(({ provider, apiKey, model }) => {
        const config: ProviderConfig = {
          apiKey,
          model,
          maxTokens: 1024,
          timeout: 30000,
          maxRetries: 3,
        };

        const providerInstance = ProviderFactory.create(provider, config);

        // Should accept unified request format
        expect(() => providerInstance.transformRequest(request)).not.toThrow();
      });
    });

    it('should transform system messages correctly for each provider', () => {
      const request = {
        messages: [
          { role: 'system' as const, content: 'You are helpful' },
          { role: 'user' as const, content: 'Hello' },
        ],
        maxTokens: 100,
      };

      // Anthropic - system separate
      const anthropicConfig: ProviderConfig = {
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 1024,
        timeout: 30000,
        maxRetries: 3,
      };
      const anthropic = ProviderFactory.create(AIProvider.ANTHROPIC, anthropicConfig);
      const anthropicTransformed = anthropic.transformRequest(request) as Record<string, unknown>;
      expect(anthropicTransformed.system).toBe('You are helpful');

      // OpenAI - system in messages
      const openaiConfig: ProviderConfig = {
        apiKey: 'sk-test',
        model: 'gpt-4o',
        maxTokens: 1024,
        timeout: 30000,
        maxRetries: 3,
      };
      const openai = ProviderFactory.create(AIProvider.OPENAI, openaiConfig);
      const openaiTransformed = openai.transformRequest(request) as Record<string, unknown>;
      const openaiMessages = openaiTransformed.messages as Array<Record<string, string>>;
      expect(openaiMessages[0].role).toBe('system');
      expect(openaiMessages[0].content).toBe('You are helpful');

      // Google - systemInstruction separate
      const googleConfig: ProviderConfig = {
        apiKey: 'AIzatest',
        model: 'gemini-1.5-pro',
        maxTokens: 1024,
        timeout: 30000,
        maxRetries: 3,
      };
      const google = ProviderFactory.create(AIProvider.GOOGLE, googleConfig);
      const googleTransformed = google.transformRequest(request) as Record<string, unknown>;
      expect(googleTransformed.systemInstruction).toBeDefined();
    });
  });

  describe('API Configuration', () => {
    it('should use correct API endpoints for each provider', () => {
      const config: ProviderConfig = {
        apiKey: 'test',
        model: 'test',
        maxTokens: 1024,
        timeout: 30000,
        maxRetries: 3,
      };

      const anthropic = ProviderFactory.create(AIProvider.ANTHROPIC, {
        ...config,
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
      });
      expect(anthropic.baseUrl).toBe('https://api.anthropic.com/v1/messages');

      const openai = ProviderFactory.create(AIProvider.OPENAI, {
        ...config,
        apiKey: 'sk-test',
        model: 'gpt-4o',
      });
      expect(openai.baseUrl).toBe('https://api.openai.com/v1/chat/completions');

      const google = ProviderFactory.create(AIProvider.GOOGLE, {
        ...config,
        apiKey: 'AIzatest',
        model: 'gemini-1.5-pro',
      });
      expect(google.baseUrl).toContain('generativelanguage.googleapis.com');
      expect(google.baseUrl).toContain('key=AIzatest');
    });

    it('should use correct authentication headers for each provider', () => {
      const config: ProviderConfig = {
        apiKey: 'test',
        model: 'test',
        maxTokens: 1024,
        timeout: 30000,
        maxRetries: 3,
      };

      const anthropic = ProviderFactory.create(AIProvider.ANTHROPIC, {
        ...config,
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
      });
      expect(anthropic.headers['x-api-key']).toBe('sk-ant-test');
      expect(anthropic.headers['anthropic-version']).toBe('2023-06-01');

      const openai = ProviderFactory.create(AIProvider.OPENAI, {
        ...config,
        apiKey: 'sk-test',
        model: 'gpt-4o',
      });
      expect(openai.headers.Authorization).toBe('Bearer sk-test');

      const google = ProviderFactory.create(AIProvider.GOOGLE, {
        ...config,
        apiKey: 'AIzatest',
        model: 'gemini-1.5-pro',
      });
      // Google uses API key in URL, not header
      expect(google.headers.Authorization).toBeUndefined();
    });
  });
});
