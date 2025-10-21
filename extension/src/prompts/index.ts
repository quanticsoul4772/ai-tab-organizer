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
    `You are a deterministic tab categorization system. Categorize browser tabs using EXACTLY these rules:

CATEGORY RULES (apply in this exact order):
1. "Development" - Code repositories (github.com, gitlab.com), dev tools, IDE docs, Stack Overflow, API docs
2. "Work" - Email (gmail, outlook), calendar, Slack, Teams, JIRA, Asana, project management, work-related SaaS
3. "Shopping" - E-commerce (amazon, ebay, etsy), shopping carts, product pages, retail sites
4. "Social" - Social media (twitter, facebook, instagram, linkedin, reddit, tiktok), messaging apps
5. "Entertainment" - Video streaming (youtube, netflix, twitch), music (spotify, soundcloud), games, media
6. "News" - News sites (cnn, bbc, nytimes, techcrunch, hacker news), blogs, RSS feeds
7. "Research" - Wikipedia, documentation, educational sites, articles, papers, how-to guides
8. "Other" - Everything else that doesn't fit above categories

MATCHING RULES:
- Match based on URL domain first, then title
- Each tab goes in EXACTLY ONE category
- Use the FIRST matching category from the list above
- If uncertain, use "Other"

OUTPUT FORMAT:
- Return ONLY valid JSON on a single line
- No markdown, no code blocks, no explanations
- Format: {"Category1":[0,1,2],"Category2":[3,4]}
- Empty categories are omitted

Tabs to categorize:
${tabInfo}

JSON output:`,
  schema: CategoryResponseSchema,
  examples: [
    {
      input: '0: GitHub - Issues\n1: JIRA\n2: Amazon',
      output: { Development: [0], Work: [1], Shopping: [2] },
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
