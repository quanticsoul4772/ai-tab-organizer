/**
 * Background service worker action constants
 *
 * Centralized constants for all chrome.runtime.sendMessage actions
 * to ensure type safety and prevent typos.
 */

/**
 * Background worker action types
 */
export const BACKGROUND_ACTIONS = {
  /** Categorize tabs using Claude API */
  CATEGORIZE: 'categorize',

  /** Summarize a single tab */
  SUMMARIZE_TAB: 'summarizeTab',

  /** Summarize a category of tabs */
  SUMMARIZE_CATEGORY: 'summarizeCategory',

  /** Extract content from a tab */
  EXTRACT_CONTENT: 'extractContent',

  /** Get tab metadata (activity, duplicates, Jira status) */
  GET_TAB_METADATA: 'getTabMetadata',
} as const;

/**
 * Type for valid background actions
 */
export type BackgroundAction = (typeof BACKGROUND_ACTIONS)[keyof typeof BACKGROUND_ACTIONS];

/**
 * Type guard to check if a string is a valid background action
 */
export function isBackgroundAction(action: string): action is BackgroundAction {
  return Object.values(BACKGROUND_ACTIONS).includes(action as BackgroundAction);
}
