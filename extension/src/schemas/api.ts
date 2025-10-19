import { z } from 'zod';

/**
 * Anthropic Claude API Response Schema
 * Validates the structure of responses from the Claude API
 */
export const ClaudeResponseSchema = z.object({
  id: z.string(),
  type: z.literal('message'),
  role: z.literal('assistant'),
  content: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string(),
    })
  ),
  model: z.string(),
  stop_reason: z.enum(['end_turn', 'max_tokens', 'stop_sequence']).optional(),
  stop_sequence: z.string().nullable().optional(),
  usage: z
    .object({
      input_tokens: z.number(),
      output_tokens: z.number(),
    })
    .optional(),
});

export type ClaudeResponse = z.infer<typeof ClaudeResponseSchema>;

/**
 * Category Response Schema
 * Validates tab categorization results from Claude API
 * Format: { "Work": [0, 1, 2], "Development": [3, 4], ... }
 */
export const CategoryResponseSchema = z.record(z.string(), z.array(z.number()));

export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;

/**
 * Tab Summary Schema
 * Validates individual tab summary responses
 */
export const TabSummarySchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type TabSummary = z.infer<typeof TabSummarySchema>;

/**
 * Category Summary Schema
 * Validates category-level summary responses
 */
export const CategorySummarySchema = z.object({
  summary: z.string(),
  tabCount: z.number(),
  commonThemes: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type CategorySummary = z.infer<typeof CategorySummarySchema>;

/**
 * Content Extraction Schema
 * Validates content extracted from tab pages
 */
export const ContentExtractionSchema = z.object({
  title: z.string(),
  headings: z.array(z.string()),
  content: z.string(),
  metaDescription: z.string().optional(),
  url: z.string().url(),
});

export type ContentExtraction = z.infer<typeof ContentExtractionSchema>;

/**
 * API Error Response Schema
 * Validates error responses from the API
 */
export const APIErrorSchema = z.object({
  type: z.string(),
  message: z.string(),
  error: z
    .object({
      type: z.string(),
      message: z.string(),
    })
    .optional(),
});

export type APIError = z.infer<typeof APIErrorSchema>;
