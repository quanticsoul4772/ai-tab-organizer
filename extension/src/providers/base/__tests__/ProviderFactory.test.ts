/**
 * Tests for ProviderFactory
 */

import { describe, it, expect } from 'vitest';
import { ProviderFactory } from '../ProviderFactory';
import { AIProvider, ProviderConfig } from '../types';

describe('ProviderFactory', () => {
  const mockConfig: ProviderConfig = {
    apiKey: 'test-key',
    model: 'test-model',
    maxTokens: 100,
    timeout: 5000,
    maxRetries: 2,
  };

  describe('create', () => {
    it('should throw for unimplemented Anthropic provider', () => {
      expect(() => ProviderFactory.create(AIProvider.ANTHROPIC, mockConfig)).toThrow(
        'Anthropic provider not yet implemented'
      );
    });

    it('should throw for unimplemented OpenAI provider', () => {
      expect(() => ProviderFactory.create(AIProvider.OPENAI, mockConfig)).toThrow(
        'OpenAI provider not yet implemented'
      );
    });

    it('should throw for unimplemented Google provider', () => {
      expect(() => ProviderFactory.create(AIProvider.GOOGLE, mockConfig)).toThrow(
        'Google provider not yet implemented'
      );
    });

    it('should throw for unsupported provider', () => {
      expect(() => ProviderFactory.create('unsupported' as AIProvider, mockConfig)).toThrow(
        'Unsupported provider: unsupported'
      );
    });
  });

  describe('isSupported', () => {
    it('should return true for Anthropic', () => {
      expect(ProviderFactory.isSupported(AIProvider.ANTHROPIC)).toBe(true);
    });

    it('should return true for OpenAI', () => {
      expect(ProviderFactory.isSupported(AIProvider.OPENAI)).toBe(true);
    });

    it('should return true for Google', () => {
      expect(ProviderFactory.isSupported(AIProvider.GOOGLE)).toBe(true);
    });

    it('should return false for unsupported provider', () => {
      expect(ProviderFactory.isSupported('unsupported' as AIProvider)).toBe(false);
    });
  });

  describe('getSupportedProviders', () => {
    it('should return all supported providers', () => {
      const providers = ProviderFactory.getSupportedProviders();
      expect(providers).toEqual([AIProvider.ANTHROPIC, AIProvider.OPENAI, AIProvider.GOOGLE]);
    });
  });

  describe('getProviderDisplayName', () => {
    it('should return correct name for Anthropic', () => {
      expect(ProviderFactory.getProviderDisplayName(AIProvider.ANTHROPIC)).toBe('Anthropic');
    });

    it('should return correct name for OpenAI', () => {
      expect(ProviderFactory.getProviderDisplayName(AIProvider.OPENAI)).toBe('OpenAI');
    });

    it('should return correct name for Google', () => {
      expect(ProviderFactory.getProviderDisplayName(AIProvider.GOOGLE)).toBe('Google');
    });

    it('should return provider string for unknown', () => {
      expect(ProviderFactory.getProviderDisplayName('unknown' as AIProvider)).toBe('unknown');
    });
  });

  describe('getProviderConsoleUrl', () => {
    it('should return Anthropic console URL', () => {
      expect(ProviderFactory.getProviderConsoleUrl(AIProvider.ANTHROPIC)).toBe(
        'https://console.anthropic.com'
      );
    });

    it('should return OpenAI console URL', () => {
      expect(ProviderFactory.getProviderConsoleUrl(AIProvider.OPENAI)).toBe(
        'https://platform.openai.com'
      );
    });

    it('should return Google console URL', () => {
      expect(ProviderFactory.getProviderConsoleUrl(AIProvider.GOOGLE)).toBe(
        'https://aistudio.google.com'
      );
    });

    it('should return empty string for unknown provider', () => {
      expect(ProviderFactory.getProviderConsoleUrl('unknown' as AIProvider)).toBe('');
    });
  });

  describe('getApiKeyPlaceholder', () => {
    it('should return Anthropic placeholder', () => {
      expect(ProviderFactory.getApiKeyPlaceholder(AIProvider.ANTHROPIC)).toBe('sk-ant-...');
    });

    it('should return OpenAI placeholder', () => {
      expect(ProviderFactory.getApiKeyPlaceholder(AIProvider.OPENAI)).toBe('sk-...');
    });

    it('should return Google placeholder', () => {
      expect(ProviderFactory.getApiKeyPlaceholder(AIProvider.GOOGLE)).toBe('AIza...');
    });

    it('should return default placeholder for unknown', () => {
      expect(ProviderFactory.getApiKeyPlaceholder('unknown' as AIProvider)).toBe(
        'Enter API key...'
      );
    });
  });

  describe('validateApiKeyFormat', () => {
    describe('Anthropic', () => {
      it('should validate correct format', () => {
        expect(ProviderFactory.validateApiKeyFormat(AIProvider.ANTHROPIC, 'sk-ant-1234')).toBe(
          true
        );
      });

      it('should reject incorrect format', () => {
        expect(ProviderFactory.validateApiKeyFormat(AIProvider.ANTHROPIC, 'sk-1234')).toBe(false);
      });

      it('should reject empty key', () => {
        expect(ProviderFactory.validateApiKeyFormat(AIProvider.ANTHROPIC, '')).toBe(false);
      });
    });

    describe('OpenAI', () => {
      it('should validate correct format', () => {
        expect(ProviderFactory.validateApiKeyFormat(AIProvider.OPENAI, 'sk-1234')).toBe(true);
      });

      it('should reject Anthropic format', () => {
        expect(ProviderFactory.validateApiKeyFormat(AIProvider.OPENAI, 'sk-ant-1234')).toBe(
          false
        );
      });

      it('should reject incorrect format', () => {
        expect(ProviderFactory.validateApiKeyFormat(AIProvider.OPENAI, 'invalid')).toBe(false);
      });
    });

    describe('Google', () => {
      it('should validate correct format', () => {
        expect(ProviderFactory.validateApiKeyFormat(AIProvider.GOOGLE, 'AIza1234')).toBe(true);
      });

      it('should reject incorrect format', () => {
        expect(ProviderFactory.validateApiKeyFormat(AIProvider.GOOGLE, 'sk-1234')).toBe(false);
      });
    });

    it('should allow any format for unknown provider', () => {
      expect(
        ProviderFactory.validateApiKeyFormat('unknown' as AIProvider, 'any-format')
      ).toBe(true);
    });
  });
});
