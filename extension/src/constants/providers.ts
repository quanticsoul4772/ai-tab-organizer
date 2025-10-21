/**
 * Provider and model configuration constants
 */

import { AIProvider } from '../providers/base/types';

/**
 * Available models for each AI provider
 */
export const PROVIDER_MODELS: Record<AIProvider, Array<{ value: string; label: string }>> = {
  [AIProvider.ANTHROPIC]: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recommended)' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Faster, Cheaper)' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Most Capable)' },
  ],
  [AIProvider.OPENAI]: [
    { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster, Cheaper)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
  ],
  [AIProvider.GOOGLE]: [{ value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Recommended)' }],
};

/**
 * Provider display information
 */
export const PROVIDER_INFO: Record<
  AIProvider,
  {
    name: string;
    consoleUrl: string;
    apiKeyPlaceholder: string;
    description: string;
  }
> = {
  [AIProvider.ANTHROPIC]: {
    name: 'Anthropic Claude',
    consoleUrl: 'https://console.anthropic.com',
    apiKeyPlaceholder: 'sk-ant-...',
    description: 'Claude 3.5 Sonnet excels at complex reasoning and long context windows',
  },
  [AIProvider.OPENAI]: {
    name: 'OpenAI GPT',
    consoleUrl: 'https://platform.openai.com/api-keys',
    apiKeyPlaceholder: 'sk-proj-...',
    description: 'GPT-4o offers strong performance with multimodal capabilities',
  },
  [AIProvider.GOOGLE]: {
    name: 'Google Gemini',
    consoleUrl: 'https://aistudio.google.com/apikey',
    apiKeyPlaceholder: 'AIza...',
    description: 'Gemini 1.5 Pro features a massive 1M token context window',
  },
};

/**
 * Get available providers as dropdown options
 */
export function getProviderOptions(): Array<{ value: AIProvider; label: string }> {
  return [
    { value: AIProvider.ANTHROPIC, label: PROVIDER_INFO[AIProvider.ANTHROPIC].name },
    { value: AIProvider.OPENAI, label: PROVIDER_INFO[AIProvider.OPENAI].name },
    { value: AIProvider.GOOGLE, label: PROVIDER_INFO[AIProvider.GOOGLE].name },
  ];
}

/**
 * Get models for a specific provider
 */
export function getModelsForProvider(
  provider: AIProvider
): Array<{ value: string; label: string }> {
  return PROVIDER_MODELS[provider] || [];
}

/**
 * Validate API key format for a provider
 */
export function validateApiKey(provider: AIProvider, apiKey: string): boolean {
  // Basic validation - check if key starts with expected prefix
  switch (provider) {
    case AIProvider.ANTHROPIC:
      return apiKey.startsWith('sk-ant-');
    case AIProvider.OPENAI:
      return apiKey.startsWith('sk-');
    case AIProvider.GOOGLE:
      return apiKey.startsWith('AIza');
    default:
      return false;
  }
}
