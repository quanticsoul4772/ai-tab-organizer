/**
 * Tests for model configurations
 */

import { describe, it, expect } from 'vitest';
import {
  AVAILABLE_MODELS,
  getModelsForProvider,
  getDefaultModel,
  getModelById,
  getAllModels,
  isModelSupported,
  getProviderForModel,
  formatModelDisplay,
  calculateCost,
  getRecommendedModels,
  getBudgetModels,
  getLargeContextModels,
} from '../models';
import { AIProvider } from '../base/types';

describe('models', () => {
  describe('AVAILABLE_MODELS', () => {
    it('should have models for all providers', () => {
      expect(AVAILABLE_MODELS[AIProvider.ANTHROPIC]).toBeDefined();
      expect(AVAILABLE_MODELS[AIProvider.OPENAI]).toBeDefined();
      expect(AVAILABLE_MODELS[AIProvider.GOOGLE]).toBeDefined();
    });

    it('should have at least one model per provider', () => {
      expect(AVAILABLE_MODELS[AIProvider.ANTHROPIC].length).toBeGreaterThan(0);
      expect(AVAILABLE_MODELS[AIProvider.OPENAI].length).toBeGreaterThan(0);
      expect(AVAILABLE_MODELS[AIProvider.GOOGLE].length).toBeGreaterThan(0);
    });

    it('should have valid model configurations', () => {
      const allModels = getAllModels();
      allModels.forEach((model) => {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.provider).toBeDefined();
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.maxOutputTokens).toBeGreaterThan(0);
        expect(model.costPer1kInput).toBeGreaterThanOrEqual(0);
        expect(model.costPer1kOutput).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('getModelsForProvider', () => {
    it('should return Anthropic models', () => {
      const models = getModelsForProvider(AIProvider.ANTHROPIC);
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === AIProvider.ANTHROPIC)).toBe(true);
    });

    it('should return OpenAI models', () => {
      const models = getModelsForProvider(AIProvider.OPENAI);
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === AIProvider.OPENAI)).toBe(true);
    });

    it('should return Google models', () => {
      const models = getModelsForProvider(AIProvider.GOOGLE);
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === AIProvider.GOOGLE)).toBe(true);
    });

    it('should return empty array for unknown provider', () => {
      const models = getModelsForProvider('unknown' as AIProvider);
      expect(models).toEqual([]);
    });
  });

  describe('getDefaultModel', () => {
    it('should return first model for Anthropic', () => {
      const defaultModel = getDefaultModel(AIProvider.ANTHROPIC);
      expect(defaultModel).toBe('claude-3-5-sonnet-20241022');
    });

    it('should return first model for OpenAI', () => {
      const defaultModel = getDefaultModel(AIProvider.OPENAI);
      expect(defaultModel).toBe('gpt-4o');
    });

    it('should return first model for Google', () => {
      const defaultModel = getDefaultModel(AIProvider.GOOGLE);
      expect(defaultModel).toBe('gemini-2.0-flash-exp');
    });

    it('should return empty string for unknown provider', () => {
      const defaultModel = getDefaultModel('unknown' as AIProvider);
      expect(defaultModel).toBe('');
    });
  });

  describe('getModelById', () => {
    it('should find Claude model', () => {
      const model = getModelById('claude-3-5-sonnet-20241022');
      expect(model).toBeDefined();
      expect(model?.name).toBe('Claude 3.5 Sonnet');
      expect(model?.provider).toBe(AIProvider.ANTHROPIC);
    });

    it('should find OpenAI model', () => {
      const model = getModelById('gpt-4o');
      expect(model).toBeDefined();
      expect(model?.name).toBe('GPT-4o');
      expect(model?.provider).toBe(AIProvider.OPENAI);
    });

    it('should find Google model', () => {
      const model = getModelById('gemini-2.0-flash-exp');
      expect(model).toBeDefined();
      expect(model?.name).toBe('Gemini 2.0 Flash');
      expect(model?.provider).toBe(AIProvider.GOOGLE);
    });

    it('should return undefined for unknown model', () => {
      const model = getModelById('unknown-model');
      expect(model).toBeUndefined();
    });
  });

  describe('getAllModels', () => {
    it('should return all models from all providers', () => {
      const allModels = getAllModels();
      const expectedCount =
        AVAILABLE_MODELS[AIProvider.ANTHROPIC].length +
        AVAILABLE_MODELS[AIProvider.OPENAI].length +
        AVAILABLE_MODELS[AIProvider.GOOGLE].length;

      expect(allModels.length).toBe(expectedCount);
    });

    it('should include models from all providers', () => {
      const allModels = getAllModels();
      const providers = new Set(allModels.map((m) => m.provider));

      expect(providers.has(AIProvider.ANTHROPIC)).toBe(true);
      expect(providers.has(AIProvider.OPENAI)).toBe(true);
      expect(providers.has(AIProvider.GOOGLE)).toBe(true);
    });
  });

  describe('isModelSupported', () => {
    it('should return true for supported Claude model', () => {
      expect(isModelSupported('claude-3-5-sonnet-20241022')).toBe(true);
    });

    it('should return true for supported OpenAI model', () => {
      expect(isModelSupported('gpt-4o')).toBe(true);
    });

    it('should return true for supported Google model', () => {
      expect(isModelSupported('gemini-2.0-flash-exp')).toBe(true);
    });

    it('should return false for unsupported model', () => {
      expect(isModelSupported('unknown-model')).toBe(false);
    });
  });

  describe('getProviderForModel', () => {
    it('should return Anthropic for Claude model', () => {
      expect(getProviderForModel('claude-3-5-sonnet-20241022')).toBe(AIProvider.ANTHROPIC);
    });

    it('should return OpenAI for GPT model', () => {
      expect(getProviderForModel('gpt-4o')).toBe(AIProvider.OPENAI);
    });

    it('should return Google for Gemini model', () => {
      expect(getProviderForModel('gemini-2.0-flash-exp')).toBe(AIProvider.GOOGLE);
    });

    it('should return undefined for unknown model', () => {
      expect(getProviderForModel('unknown-model')).toBeUndefined();
    });
  });

  describe('formatModelDisplay', () => {
    it('should format Claude model', () => {
      const model = getModelById('claude-3-5-sonnet-20241022')!;
      expect(formatModelDisplay(model)).toBe('Claude 3.5 Sonnet (200K context)');
    });

    it('should format OpenAI model', () => {
      const model = getModelById('gpt-4o')!;
      expect(formatModelDisplay(model)).toBe('GPT-4o (128K context)');
    });

    it('should format Google model', () => {
      const model = getModelById('gemini-2.0-flash-exp')!;
      expect(formatModelDisplay(model)).toBe('Gemini 2.0 Flash (1000K context)');
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly', () => {
      const model = getModelById('claude-3-5-sonnet-20241022')!;
      const cost = calculateCost(model, 1000, 500);

      // 1000 input tokens = 1K * $0.003 = $0.003
      // 500 output tokens = 0.5K * $0.015 = $0.0075
      // Total = $0.0105
      expect(cost).toBeCloseTo(0.0105, 4);
    });

    it('should handle zero tokens', () => {
      const model = getModelById('gpt-4o')!;
      const cost = calculateCost(model, 0, 0);
      expect(cost).toBe(0);
    });

    it('should calculate cost for large token counts', () => {
      const model = getModelById('gemini-2.0-flash-exp')!;
      const cost = calculateCost(model, 100000, 50000);

      // Gemini 2.0 Flash is free (experimental)
      // 100K input = 100K/1000 * $0.0 = $0.0
      // 50K output = 50K/1000 * $0.0 = $0.0
      // Total = $0.0
      expect(cost).toBe(0);
    });
  });

  describe('getRecommendedModels', () => {
    it('should return recommended models', () => {
      const models = getRecommendedModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.length).toBeLessThanOrEqual(3);
    });

    it('should include models from different providers', () => {
      const models = getRecommendedModels();
      const providers = new Set(models.map((m) => m.provider));
      expect(providers.size).toBeGreaterThan(1);
    });
  });

  describe('getBudgetModels', () => {
    it('should return budget-friendly models', () => {
      const models = getBudgetModels();
      expect(models.length).toBe(3);
    });

    it('should return models sorted by cost', () => {
      const models = getBudgetModels();
      for (let i = 0; i < models.length - 1; i++) {
        const cost1 = models[i].costPer1kInput + models[i].costPer1kOutput;
        const cost2 = models[i + 1].costPer1kInput + models[i + 1].costPer1kOutput;
        expect(cost1).toBeLessThanOrEqual(cost2);
      }
    });

    it('should include cheapest models', () => {
      const models = getBudgetModels();
      const modelIds = models.map((m) => m.id);

      // Gemini 2.0 Flash (free) should be the cheapest
      expect(modelIds).toContain('gemini-2.0-flash-exp');
    });
  });

  describe('getLargeContextModels', () => {
    it('should return large context models', () => {
      const models = getLargeContextModels();
      expect(models.length).toBe(3);
    });

    it('should return models sorted by context window', () => {
      const models = getLargeContextModels();
      for (let i = 0; i < models.length - 1; i++) {
        expect(models[i].contextWindow).toBeGreaterThanOrEqual(models[i + 1].contextWindow);
      }
    });

    it('should include Gemini models (largest context)', () => {
      const models = getLargeContextModels();
      const geminiModels = models.filter((m) => m.provider === AIProvider.GOOGLE);
      expect(geminiModels.length).toBeGreaterThan(0);
    });
  });
});
