/**
 * Factory for creating AI provider instances
 */

import { BaseProvider } from './BaseProvider';
import { AIProvider, ProviderConfig } from './types';

/**
 * Provider factory class
 * Creates instances of AI providers based on configuration
 */
export class ProviderFactory {
  /**
   * Create a provider instance
   * @param provider - AI provider type
   * @param config - Provider configuration
   * @returns Provider instance
   * @throws Error if provider is not supported or implementation not found
   */
  static create(provider: AIProvider, config: ProviderConfig): BaseProvider {
    switch (provider) {
      case AIProvider.ANTHROPIC:
        // Lazy load to avoid circular dependencies
        return ProviderFactory.createAnthropicProvider(config);

      case AIProvider.OPENAI:
        return ProviderFactory.createOpenAIProvider(config);

      case AIProvider.GOOGLE:
        return ProviderFactory.createGoogleProvider(config);

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Create Anthropic provider instance
   * @param config - Provider configuration
   * @returns Anthropic provider instance
   */
  private static createAnthropicProvider(config: ProviderConfig): BaseProvider {
    // Dynamic import to avoid circular dependencies
    // Will be implemented in Phase 2
    throw new Error('Anthropic provider not yet implemented');
  }

  /**
   * Create OpenAI provider instance
   * @param config - Provider configuration
   * @returns OpenAI provider instance
   */
  private static createOpenAIProvider(config: ProviderConfig): BaseProvider {
    // Dynamic import to avoid circular dependencies
    // Will be implemented in Phase 2
    throw new Error('OpenAI provider not yet implemented');
  }

  /**
   * Create Google provider instance
   * @param config - Provider configuration
   * @returns Google provider instance
   */
  private static createGoogleProvider(config: ProviderConfig): BaseProvider {
    // Dynamic import to avoid circular dependencies
    // Will be implemented in Phase 2
    throw new Error('Google provider not yet implemented');
  }

  /**
   * Check if a provider is supported
   * @param provider - AI provider type
   * @returns True if provider is supported
   */
  static isSupported(provider: AIProvider): boolean {
    return [AIProvider.ANTHROPIC, AIProvider.OPENAI, AIProvider.GOOGLE].includes(provider);
  }

  /**
   * Get list of all supported providers
   * @returns Array of supported providers
   */
  static getSupportedProviders(): AIProvider[] {
    return [AIProvider.ANTHROPIC, AIProvider.OPENAI, AIProvider.GOOGLE];
  }

  /**
   * Get provider display name
   * @param provider - AI provider type
   * @returns Human-readable provider name
   */
  static getProviderDisplayName(provider: AIProvider): string {
    switch (provider) {
      case AIProvider.ANTHROPIC:
        return 'Anthropic';
      case AIProvider.OPENAI:
        return 'OpenAI';
      case AIProvider.GOOGLE:
        return 'Google';
      default:
        return provider;
    }
  }

  /**
   * Get provider console URL for getting API keys
   * @param provider - AI provider type
   * @returns Console URL string
   */
  static getProviderConsoleUrl(provider: AIProvider): string {
    switch (provider) {
      case AIProvider.ANTHROPIC:
        return 'https://console.anthropic.com';
      case AIProvider.OPENAI:
        return 'https://platform.openai.com';
      case AIProvider.GOOGLE:
        return 'https://aistudio.google.com';
      default:
        return '';
    }
  }

  /**
   * Get API key placeholder text for provider
   * @param provider - AI provider type
   * @returns Placeholder string for API key input
   */
  static getApiKeyPlaceholder(provider: AIProvider): string {
    switch (provider) {
      case AIProvider.ANTHROPIC:
        return 'sk-ant-...';
      case AIProvider.OPENAI:
        return 'sk-...';
      case AIProvider.GOOGLE:
        return 'AIza...';
      default:
        return 'Enter API key...';
    }
  }

  /**
   * Validate API key format (basic check)
   * @param provider - AI provider type
   * @param apiKey - API key to validate
   * @returns True if format looks valid
   */
  static validateApiKeyFormat(provider: AIProvider, apiKey: string): boolean {
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    switch (provider) {
      case AIProvider.ANTHROPIC:
        // Anthropic keys start with sk-ant-
        return apiKey.startsWith('sk-ant-');

      case AIProvider.OPENAI:
        // OpenAI keys start with sk- (but not sk-ant-)
        return apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant-');

      case AIProvider.GOOGLE:
        // Google keys start with AIza
        return apiKey.startsWith('AIza');

      default:
        return true; // Unknown provider, allow any format
    }
  }
}
