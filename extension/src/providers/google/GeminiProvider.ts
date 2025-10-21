/**
 * Google Gemini provider implementation
 */

import { BaseProvider } from '../base/BaseProvider';
import { AIProvider, UnifiedRequest, UnifiedResponse } from '../base/types';

/**
 * Gemini-specific response format
 */
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Rate limiter for Google Gemini API
 * Enforces: 15 RPM (requests per minute) for free tier
 */
class GeminiRateLimiter {
  private static instance: GeminiRateLimiter;
  private requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS_PER_MINUTE = 15;
  private readonly WINDOW_MS = 60000; // 1 minute

  static getInstance(): GeminiRateLimiter {
    if (!GeminiRateLimiter.instance) {
      GeminiRateLimiter.instance = new GeminiRateLimiter();
    }
    return GeminiRateLimiter.instance;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();

    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.WINDOW_MS
    );

    // If we're at the limit, wait until the oldest request expires
    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = this.WINDOW_MS - (now - oldestTimestamp) + 100; // Add 100ms buffer

      console.log(
        `⏳ Rate limit reached. Waiting ${Math.round(waitTime / 1000)}s before next Gemini request...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Recursively check again after waiting
      return this.waitForSlot();
    }

    // Record this request
    this.requestTimestamps.push(Date.now());
  }

  reset(): void {
    this.requestTimestamps = [];
  }
}

/**
 * Google Gemini provider
 * Implements Gemini API integration with rate limiting
 */
export class GeminiProvider extends BaseProvider {
  private rateLimiter: GeminiRateLimiter;

  constructor(config: any) {
    super(config);
    this.rateLimiter = GeminiRateLimiter.getInstance();
  }

  get provider(): AIProvider {
    return AIProvider.GOOGLE;
  }

  /**
   * Gemini uses API key in URL query parameter
   * Note: Using v1beta for gemini-2.0 model support
   */
  get baseUrl(): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
  }

  /**
   * Gemini doesn't need Authorization header (uses URL param)
   */
  get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Override makeRequest to add rate limiting
   */
  async makeRequest(request: UnifiedRequest): Promise<UnifiedResponse> {
    // Wait for rate limiter before making request
    await this.rateLimiter.waitForSlot();

    // Call parent makeRequest implementation
    return super.makeRequest(request);
  }

  /**
   * Transform unified request to Gemini's format
   * Key differences:
   * - System message is systemInstruction (separate)
   * - Messages are in contents array
   * - Role is "model" instead of "assistant"
   * - Content is wrapped in parts array
   */
  transformRequest(request: UnifiedRequest): unknown {
    // Separate system message
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const otherMessages = request.messages.filter((m) => m.role !== 'system');

    // Transform messages to Gemini format
    const contents = otherMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user', // Gemini uses "model" not "assistant"
      parts: [
        {
          text: msg.content,
        },
      ],
    }));

    const geminiRequest: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: request.maxTokens,
        temperature: request.temperature !== undefined ? request.temperature : 0.7,
      },
    };

    // Add system instruction if present
    if (systemMessage) {
      geminiRequest.systemInstruction = {
        parts: [
          {
            text: systemMessage.content,
          },
        ],
      };
    }

    return geminiRequest;
  }

  /**
   * Transform Gemini response to unified format
   */
  transformResponse(response: unknown): UnifiedResponse {
    const geminiResponse = response as GeminiResponse;

    // Extract text from first candidate
    const candidate = geminiResponse.candidates[0];
    const content = candidate.content.parts.map((part) => part.text).join('\n');

    return {
      content,
      usage: {
        inputTokens: geminiResponse.usageMetadata.promptTokenCount,
        outputTokens: geminiResponse.usageMetadata.candidatesTokenCount,
        totalTokens: geminiResponse.usageMetadata.totalTokenCount,
      },
      model: this.config.model,
      provider: this.provider,
      raw: response,
    };
  }

  /**
   * Validate Gemini response structure
   */
  validateResponse(response: unknown): boolean {
    if (!response || typeof response !== 'object') {
      return false;
    }

    const data = response as Record<string, unknown>;

    // Check candidates array
    if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      return false;
    }

    const firstCandidate = data.candidates[0] as Record<string, unknown>;
    if (!firstCandidate.content || typeof firstCandidate.content !== 'object') {
      return false;
    }

    const content = firstCandidate.content as Record<string, unknown>;
    if (!content.parts || !Array.isArray(content.parts) || content.parts.length === 0) {
      return false;
    }

    const firstPart = content.parts[0] as Record<string, unknown>;
    if (typeof firstPart.text !== 'string') {
      return false;
    }

    // Check usage metadata
    if (!data.usageMetadata || typeof data.usageMetadata !== 'object') {
      return false;
    }

    const usage = data.usageMetadata as Record<string, unknown>;
    if (
      typeof usage.promptTokenCount !== 'number' ||
      typeof usage.candidatesTokenCount !== 'number'
    ) {
      return false;
    }

    return true;
  }
}
