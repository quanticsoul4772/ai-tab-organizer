import { z } from 'zod';

/**
 * Chrome Tab Schema
 * Validates chrome.tabs.Tab objects
 */
export const TabSchema = z.object({
  id: z.number().optional(),
  index: z.number(),
  windowId: z.number(),
  highlighted: z.boolean(),
  active: z.boolean(),
  pinned: z.boolean(),
  url: z.string().optional(),
  title: z.string().optional(),
  favIconUrl: z.string().optional(),
  status: z.enum(['loading', 'complete']).optional(),
  discarded: z.boolean().optional(),
  autoDiscardable: z.boolean().optional(),
  groupId: z.number(),
  lastAccessed: z.number().optional(),
  audible: z.boolean().optional(),
  mutedInfo: z
    .object({
      muted: z.boolean(),
    })
    .optional(),
  incognito: z.boolean(),
  width: z.number().optional(),
  height: z.number().optional(),
  sessionId: z.string().optional(),
});

export type Tab = z.infer<typeof TabSchema>;

/**
 * Simplified Tab Schema for API Communication
 * Used when sending tabs to Claude API (reduced token usage)
 */
export const SimplifiedTabSchema = z.object({
  id: z.number().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  favIconUrl: z.string().optional(),
});

export type SimplifiedTab = z.infer<typeof SimplifiedTabSchema>;

/**
 * Chrome Storage Schema
 * Validates data stored in chrome.storage.local
 */
export const StorageDataSchema = z.object({
  apiKey: z.string().optional(),
  settings: z
    .object({
      jiraSmartMode: z.boolean().optional(),
      autoIndex: z.boolean().optional(),
      summaryCache: z.boolean().optional(),
      defaultDensity: z.enum(['compact', 'normal', 'spacious']).optional(),
    })
    .optional(),
  summaryCache: z.record(z.string(), z.any()).optional(),
  tabIndex: z.record(z.string(), z.any()).optional(),
  groupStates: z.record(z.string(), z.boolean()).optional(),
  sessions: z.record(z.string(), z.any()).optional(),
});

export type StorageData = z.infer<typeof StorageDataSchema>;

/**
 * Message Schema
 * Validates chrome.runtime messages between popup and background worker
 */
export const MessageSchema = z.object({
  action: z.enum([
    'categorize',
    'summarizeTab',
    'summarizeCategory',
    'extractContent',
    'indexTab',
    'search',
  ]),
  tabs: z.array(SimplifiedTabSchema).optional(),
  tabId: z.number().optional(),
  category: z.string().optional(),
  query: z.string().optional(),
  apiKey: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

/**
 * Message Response Schema
 * Validates responses sent back from background worker
 */
export const MessageResponseSchema = z.union([
  z.object({
    success: z.literal(true),
    data: z.any(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    retryable: z.boolean().optional(),
  }),
]);

export type MessageResponse = z.infer<typeof MessageResponseSchema>;
