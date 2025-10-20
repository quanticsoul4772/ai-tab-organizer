/**
 * Common types and interfaces for AI provider abstraction layer
 */

/**
 * Supported AI providers
 */
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
}

/**
 * AI model configuration
 */
export interface AIModel {
  /** Unique model identifier (e.g., "gpt-4o", "claude-3-5-sonnet-20241022") */
  id: string;
  /** Human-readable model name */
  name: string;
  /** Provider that offers this model */
  provider: AIProvider;
  /** Maximum context window in tokens */
  contextWindow: number;
  /** Maximum output tokens */
  maxOutputTokens: number;
  /** Cost per 1K input tokens in USD */
  costPer1kInput: number;
  /** Cost per 1K output tokens in USD */
  costPer1kOutput: number;
  /** Whether this model is deprecated */
  deprecated?: boolean;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** API key for authentication */
  apiKey: string;
  /** Model identifier to use */
  model: string;
  /** Maximum tokens to generate */
  maxTokens: number;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial retry delay in milliseconds */
  initialRetryDelay?: number;
  /** Retry jitter percentage (0-100) */
  retryJitter?: number;
}

/**
 * Message role in a conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Unified message format across all providers
 */
export interface UnifiedMessage {
  /** Role of the message sender */
  role: MessageRole;
  /** Content of the message */
  content: string;
}

/**
 * Unified request format
 */
export interface UnifiedRequest {
  /** Array of messages in the conversation */
  messages: UnifiedMessage[];
  /** Maximum tokens to generate */
  maxTokens: number;
  /** Sampling temperature (0-1), optional */
  temperature?: number;
  /** Additional provider-specific options */
  options?: Record<string, unknown>;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  /** Number of input tokens used */
  inputTokens: number;
  /** Number of output tokens generated */
  outputTokens: number;
  /** Total tokens (input + output) */
  totalTokens: number;
}

/**
 * Unified response format
 */
export interface UnifiedResponse {
  /** Generated content from the model */
  content: string;
  /** Token usage statistics */
  usage: TokenUsage;
  /** Model that generated the response */
  model: string;
  /** Provider that handled the request */
  provider: AIProvider;
  /** Raw response from provider (for debugging) */
  raw?: unknown;
}

/**
 * Provider-specific error
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public statusCode?: number,
    public retryable: boolean = false,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Validation error for responses
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ProviderError {
  constructor(
    provider: AIProvider,
    public retryAfter?: number,
    statusCode?: number
  ) {
    super('Rate limit exceeded', provider, statusCode, true);
    this.name = 'RateLimitError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ProviderError {
  constructor(provider: AIProvider, statusCode?: number) {
    super('Invalid API key or authentication failed', provider, statusCode, false);
    this.name = 'AuthenticationError';
  }
}

/**
 * Abstract base provider interface
 */
export interface IProvider {
  /** Provider identifier */
  readonly provider: AIProvider;

  /** Base API URL */
  readonly baseUrl: string;

  /** HTTP headers for API requests */
  readonly headers: Record<string, string>;

  /**
   * Transform unified request to provider-specific format
   */
  transformRequest(request: UnifiedRequest): unknown;

  /**
   * Transform provider response to unified format
   */
  transformResponse(response: unknown): UnifiedResponse;

  /**
   * Validate provider response structure
   */
  validateResponse(response: unknown): boolean;

  /**
   * Make API call and return unified response
   */
  complete(request: UnifiedRequest): Promise<UnifiedResponse>;

  /**
   * Handle provider-specific errors
   */
  handleError(error: unknown, statusCode?: number): never;
}
