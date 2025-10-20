/**
 * Tests for provider types and error classes
 */

import { describe, it, expect } from 'vitest';
import {
  AIProvider,
  ProviderError,
  ValidationError,
  RateLimitError,
  AuthenticationError,
} from '../types';

describe('AIProvider enum', () => {
  it('should have correct provider values', () => {
    expect(AIProvider.OPENAI).toBe('openai');
    expect(AIProvider.ANTHROPIC).toBe('anthropic');
    expect(AIProvider.GOOGLE).toBe('google');
  });
});

describe('ProviderError', () => {
  it('should create error with required fields', () => {
    const error = new ProviderError('Test error', AIProvider.ANTHROPIC);

    expect(error.message).toBe('Test error');
    expect(error.provider).toBe(AIProvider.ANTHROPIC);
    expect(error.name).toBe('ProviderError');
    expect(error.retryable).toBe(false);
    expect(error.statusCode).toBeUndefined();
  });

  it('should create error with all fields', () => {
    const originalError = new Error('Original');
    const error = new ProviderError(
      'Test error',
      AIProvider.OPENAI,
      500,
      true,
      originalError
    );

    expect(error.message).toBe('Test error');
    expect(error.provider).toBe(AIProvider.OPENAI);
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(true);
    expect(error.originalError).toBe(originalError);
  });

  it('should be instance of Error', () => {
    const error = new ProviderError('Test', AIProvider.GOOGLE);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ProviderError);
  });
});

describe('ValidationError', () => {
  it('should create validation error', () => {
    const error = new ValidationError('Invalid response', AIProvider.ANTHROPIC);

    expect(error.message).toBe('Invalid response');
    expect(error.provider).toBe(AIProvider.ANTHROPIC);
    expect(error.name).toBe('ValidationError');
  });

  it('should include details', () => {
    const details = { field: 'content', issue: 'missing' };
    const error = new ValidationError('Invalid', AIProvider.OPENAI, details);

    expect(error.details).toEqual(details);
  });
});

describe('RateLimitError', () => {
  it('should create rate limit error', () => {
    const error = new RateLimitError(AIProvider.GOOGLE);

    expect(error.message).toBe('Rate limit exceeded');
    expect(error.provider).toBe(AIProvider.GOOGLE);
    expect(error.name).toBe('RateLimitError');
    expect(error.retryable).toBe(true);
  });

  it('should include retryAfter', () => {
    const error = new RateLimitError(AIProvider.ANTHROPIC, 60, 429);

    expect(error.retryAfter).toBe(60);
    expect(error.statusCode).toBe(429);
  });

  it('should be retryable by default', () => {
    const error = new RateLimitError(AIProvider.OPENAI);
    expect(error.retryable).toBe(true);
  });
});

describe('AuthenticationError', () => {
  it('should create authentication error', () => {
    const error = new AuthenticationError(AIProvider.ANTHROPIC);

    expect(error.message).toBe('Invalid API key or authentication failed');
    expect(error.provider).toBe(AIProvider.ANTHROPIC);
    expect(error.name).toBe('AuthenticationError');
    expect(error.retryable).toBe(false);
  });

  it('should not be retryable', () => {
    const error = new AuthenticationError(AIProvider.OPENAI, 401);
    expect(error.retryable).toBe(false);
    expect(error.statusCode).toBe(401);
  });
});
