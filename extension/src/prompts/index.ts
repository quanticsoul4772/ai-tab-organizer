import { z } from 'zod';
import { CategoryResponseSchema, type CategoryResponse } from '@schemas/index';
import type { Tab } from '@types';

export interface PromptVersion<Input, Output> {
  version: string;
  createdAt: string;
  template: (input: Input) => string;
  schema: z.ZodType<Output>;
  examples: Array<{ input: Input; output: Output }>;
}

export const CATEGORIZATION_V1: PromptVersion<string, CategoryResponse> = {
  version: '1.0.0',
  createdAt: '2025-01-19',
  template: (tabInfo: string) =>
    `Categorize these browser tabs into logical groups (Work, Research, Shopping, Social, Entertainment, Development, News, Other).

CRITICAL: Your response must be ONLY a single-line JSON object. Do not include any explanations, comments, or text before or after the JSON.

Format (single line only):
{"Work":[0,1],"Research":[2,3],"Shopping":[4]}

Tabs (by index):
${tabInfo}

Return only the JSON object as a single line, nothing else:`,
  schema: CategoryResponseSchema,
  examples: [
    {
      input: '0: GitHub - Issues\n1: JIRA\n2: Amazon',
      output: { Work: [0, 1], Shopping: [2] },
    },
  ],
};

export const TAB_SUMMARY_V1: PromptVersion<Tab, string> = {
  version: '1.0.0',
  createdAt: '2025-01-19',
  template: (tab: Tab) =>
    `Summarize this browser tab in 2-3 sentences. Focus on:
1. Main purpose/topic
2. Key information or actions available
3. Why someone might have this tab open

Tab Title: ${tab.title}
Tab URL: ${tab.url}

Provide a concise, actionable summary:`,
  schema: z.string(),
  examples: [],
};

export const PROMPTS = {
  categorization: CATEGORIZATION_V1,
  tabSummary: TAB_SUMMARY_V1,
};
