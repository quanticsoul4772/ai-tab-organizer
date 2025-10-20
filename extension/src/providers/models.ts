/**
 * AI model configurations for all supported providers
 */

import { AIModel, AIProvider } from './base/types';

/**
 * Available models for each provider
 */
export const AVAILABLE_MODELS: Record<AIProvider, AIModel[]> = {
  [AIProvider.ANTHROPIC]: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: AIProvider.ANTHROPIC,
      contextWindow: 200000,
      maxOutputTokens: 4096,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: AIProvider.ANTHROPIC,
      contextWindow: 200000,
      maxOutputTokens: 4096,
      costPer1kInput: 0.0008,
      costPer1kOutput: 0.004,
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: AIProvider.ANTHROPIC,
      contextWindow: 200000,
      maxOutputTokens: 4096,
      costPer1kInput: 0.015,
      costPer1kOutput: 0.075,
    },
  ],
  [AIProvider.OPENAI]: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: AIProvider.OPENAI,
      contextWindow: 128000,
      maxOutputTokens: 4096,
      costPer1kInput: 0.0025,
      costPer1kOutput: 0.01,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: AIProvider.OPENAI,
      contextWindow: 128000,
      maxOutputTokens: 16384,
      costPer1kInput: 0.00015,
      costPer1kOutput: 0.0006,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: AIProvider.OPENAI,
      contextWindow: 128000,
      maxOutputTokens: 4096,
      costPer1kInput: 0.01,
      costPer1kOutput: 0.03,
    },
  ],
  [AIProvider.GOOGLE]: [
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: AIProvider.GOOGLE,
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      costPer1kInput: 0.00125,
      costPer1kOutput: 0.005,
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: AIProvider.GOOGLE,
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      costPer1kInput: 0.000075,
      costPer1kOutput: 0.0003,
    },
    {
      id: 'gemini-1.5-flash-8b',
      name: 'Gemini 1.5 Flash-8B',
      provider: AIProvider.GOOGLE,
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      costPer1kInput: 0.0000375,
      costPer1kOutput: 0.00015,
    },
  ],
};

/**
 * Get all available models for a specific provider
 * @param provider - AI provider
 * @returns Array of available models
 */
export function getModelsForProvider(provider: AIProvider): AIModel[] {
  return AVAILABLE_MODELS[provider] || [];
}

/**
 * Get default model for a provider
 * @param provider - AI provider
 * @returns Default model ID
 */
export function getDefaultModel(provider: AIProvider): string {
  const models = getModelsForProvider(provider);
  return models[0]?.id || '';
}

/**
 * Get model configuration by ID
 * @param modelId - Model identifier
 * @returns Model configuration or undefined
 */
export function getModelById(modelId: string): AIModel | undefined {
  for (const models of Object.values(AVAILABLE_MODELS)) {
    const model = models.find((m) => m.id === modelId);
    if (model) {
      return model;
    }
  }
  return undefined;
}

/**
 * Get all available models across all providers
 * @returns Array of all models
 */
export function getAllModels(): AIModel[] {
  return Object.values(AVAILABLE_MODELS).flat();
}

/**
 * Check if a model is supported
 * @param modelId - Model identifier
 * @returns True if model is supported
 */
export function isModelSupported(modelId: string): boolean {
  return getAllModels().some((m) => m.id === modelId);
}

/**
 * Get provider for a model
 * @param modelId - Model identifier
 * @returns Provider or undefined
 */
export function getProviderForModel(modelId: string): AIProvider | undefined {
  const model = getModelById(modelId);
  return model?.provider;
}

/**
 * Format model name for display
 * @param model - AI model
 * @returns Formatted display string
 */
export function formatModelDisplay(model: AIModel): string {
  const contextK = Math.round(model.contextWindow / 1000);
  return `${model.name} (${contextK}K context)`;
}

/**
 * Calculate estimated cost for a request
 * @param model - AI model
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Estimated cost in USD
 */
export function calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1000) * model.costPer1kInput;
  const outputCost = (outputTokens / 1000) * model.costPer1kOutput;
  return inputCost + outputCost;
}

/**
 * Get recommended models for tab categorization (balance of speed and quality)
 * @returns Array of recommended models
 */
export function getRecommendedModels(): AIModel[] {
  return [
    getModelById('claude-3-5-sonnet-20241022')!,
    getModelById('gpt-4o')!,
    getModelById('gemini-1.5-flash')!,
  ].filter((m) => m !== undefined);
}

/**
 * Get budget-friendly models (lowest cost)
 * @returns Array of budget-friendly models
 */
export function getBudgetModels(): AIModel[] {
  const allModels = getAllModels();
  return allModels
    .sort((a, b) => {
      const costA = a.costPer1kInput + a.costPer1kOutput;
      const costB = b.costPer1kInput + b.costPer1kOutput;
      return costA - costB;
    })
    .slice(0, 3);
}

/**
 * Get models with largest context windows
 * @returns Array of models with largest context
 */
export function getLargeContextModels(): AIModel[] {
  const allModels = getAllModels();
  return allModels.sort((a, b) => b.contextWindow - a.contextWindow).slice(0, 3);
}
