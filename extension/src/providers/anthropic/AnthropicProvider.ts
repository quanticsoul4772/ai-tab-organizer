/**
 * Anthropic Claude provider implementation
 */

import { BaseProvider } from '../base/BaseProvider';
import { AIProvider, UnifiedRequest, UnifiedResponse } from '../base/types';

/**
 * Anthropic-specific response format
 */
interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Anthropic Claude provider
 * Implements Claude API integration following Anthropic's message format
 */
export class AnthropicProvider extends BaseProvider {
  get provider(): AIProvider {
    return AIProvider.ANTHROPIC;
  }

  get baseUrl(): string {
    return 'https://api.anthropic.com/v1/messages';
  }

  get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true', // Required for browser context
    };
  }

  /**
   * Transform unified request to Anthropic's format
   * Key differences:
   * - System message is a separate parameter (not in messages array)
   * - Messages must alternate between user and assistant
   */
  transformRequest(request: UnifiedRequest): unknown {
    // Separate system message from other messages
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const otherMessages = request.messages.filter((m) => m.role !== 'system');

    // Ensure messages alternate between user and assistant
    // Claude requires this strict alternation
    const formattedMessages = otherMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    // Validate alternation (first must be user)
    if (formattedMessages.length > 0 && formattedMessages[0].role !== 'user') {
      throw new Error('Anthropic requires first message to be from user');
    }

    const anthropicRequest: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: request.maxTokens,
      messages: formattedMessages,
    };

    // Add system message if present (separate parameter)
    if (systemMessage) {
      anthropicRequest.system = systemMessage.content;
    }

    // Add temperature if specified
    if (request.temperature !== undefined) {
      anthropicRequest.temperature = request.temperature;
    }

    return anthropicRequest;
  }

  /**
   * Transform Anthropic response to unified format
   */
  transformResponse(response: unknown): UnifiedResponse {
    const anthropicResponse = response as AnthropicResponse;

    // Extract text from content array (Claude returns array of content blocks)
    const content = anthropicResponse.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return {
      content,
      usage: {
        inputTokens: anthropicResponse.usage.input_tokens,
        outputTokens: anthropicResponse.usage.output_tokens,
        totalTokens: anthropicResponse.usage.input_tokens + anthropicResponse.usage.output_tokens,
      },
      model: anthropicResponse.model,
      provider: this.provider,
      raw: response,
    };
  }

  /**
   * Validate Anthropic response structure
   */
  validateResponse(response: unknown): boolean {
    if (!response || typeof response !== 'object') {
      return false;
    }

    const data = response as Record<string, unknown>;

    // Check required fields
    if (!data.content || !Array.isArray(data.content)) {
      return false;
    }

    if (!data.usage || typeof data.usage !== 'object') {
      return false;
    }

    const usage = data.usage as Record<string, unknown>;
    if (typeof usage.input_tokens !== 'number' || typeof usage.output_tokens !== 'number') {
      return false;
    }

    // Check content array has at least one text block
    const content = data.content as Array<Record<string, unknown>>;
    const hasTextContent = content.some(
      (block) => block.type === 'text' && typeof block.text === 'string'
    );

    return hasTextContent;
  }
}
