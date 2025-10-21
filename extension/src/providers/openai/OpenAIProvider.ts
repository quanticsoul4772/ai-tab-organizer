/**
 * OpenAI provider implementation
 */

import { BaseProvider } from '../base/BaseProvider';
import { AIProvider, UnifiedRequest, UnifiedResponse } from '../base/types';

/**
 * OpenAI-specific response format
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI provider
 * Implements OpenAI Chat Completions API
 */
export class OpenAIProvider extends BaseProvider {
  get provider(): AIProvider {
    return AIProvider.OPENAI;
  }

  get baseUrl(): string {
    return 'https://api.openai.com/v1/chat/completions';
  }

  get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  /**
   * Transform unified request to OpenAI's format
   * Key differences:
   * - System message is part of messages array (not separate)
   * - More flexible message ordering
   */
  transformRequest(request: UnifiedRequest): unknown {
    // OpenAI accepts all message types in the messages array
    const messages = request.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const openAIRequest: Record<string, unknown> = {
      model: this.config.model,
      messages,
      max_tokens: request.maxTokens,
    };

    // Add temperature if specified (default 0.7)
    if (request.temperature !== undefined) {
      openAIRequest.temperature = request.temperature;
    } else {
      openAIRequest.temperature = 0.7;
    }

    return openAIRequest;
  }

  /**
   * Transform OpenAI response to unified format
   */
  transformResponse(response: unknown): UnifiedResponse {
    const openAIResponse = response as OpenAIResponse;

    // OpenAI returns choices array, we take the first one
    const content = openAIResponse.choices[0].message.content;

    return {
      content,
      usage: {
        inputTokens: openAIResponse.usage.prompt_tokens,
        outputTokens: openAIResponse.usage.completion_tokens,
        totalTokens: openAIResponse.usage.total_tokens,
      },
      model: openAIResponse.model,
      provider: this.provider,
      raw: response,
    };
  }

  /**
   * Validate OpenAI response structure
   */
  validateResponse(response: unknown): boolean {
    if (!response || typeof response !== 'object') {
      return false;
    }

    const data = response as Record<string, unknown>;

    // Check required fields
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      return false;
    }

    const firstChoice = data.choices[0] as Record<string, unknown>;
    if (!firstChoice.message || typeof firstChoice.message !== 'object') {
      return false;
    }

    const message = firstChoice.message as Record<string, unknown>;
    if (typeof message.content !== 'string') {
      return false;
    }

    // Check usage
    if (!data.usage || typeof data.usage !== 'object') {
      return false;
    }

    const usage = data.usage as Record<string, unknown>;
    if (typeof usage.prompt_tokens !== 'number' || typeof usage.completion_tokens !== 'number') {
      return false;
    }

    return true;
  }
}
