// Background service worker for AI Tab Organizer

import { retryWithValidation, isRetryableHttpError } from '@utils/retry';
import {
  ClaudeResponseSchema,
  CategoryResponseSchema,
  type ClaudeResponse,
  type CategoryResponse,
} from '@schemas/index';
import type { TabSummary, CategorySummary } from '@types/index';

// Type definitions
interface ApiConfig {
  BASE_URL: string;
  MODEL: string;
  MAX_TOKENS: number;
  VERSION: string;
  TIMEOUT_MS: number;
  MAX_RETRIES: number;
  INITIAL_DELAY_MS: number;
  JITTER_PERCENT: number;
}

interface BackgroundRequest {
  action: 'categorize' | 'summarizeTab' | 'summarizeCategory' | 'extractContent' | 'getTabMetadata';
  tabs?: chrome.tabs.Tab[];
  tab?: chrome.tabs.Tab;
  apiKey?: string;
  categoryName?: string;
  tabId?: number;
  url?: string;
}

interface BackgroundResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// CategoryResponse, TabSummary, and CategorySummary now imported from schemas

interface ExtractedContent {
  headings: string[];
  paragraphs: string[];
  metaDescription: string | null;
  hasContent: boolean;
  content?: string;
  contentLength?: number;
}

// ClaudeResponse now imported from schemas (as ClaudeResponse type)

const API_CONFIG: ApiConfig = {
  BASE_URL: 'https://api.anthropic.com/v1/messages',
  MODEL: 'claude-3-5-sonnet-20241022',
  MAX_TOKENS: 1024,
  VERSION: '2023-06-01',
  TIMEOUT_MS: 30000, // 30 seconds
  MAX_RETRIES: 3, // Increased from 2 to 3 with exponential backoff
  INITIAL_DELAY_MS: 1000, // 1 second initial delay
  JITTER_PERCENT: 30, // 30% jitter to prevent thundering herd
};

chrome.runtime.onMessage.addListener(
  (
    request: BackgroundRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: BackgroundResponse) => void
  ) => {
    if (request.action === 'categorize') {
      categorizeTabs(request.tabs, request.apiKey)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => {
          console.error('Categorization error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (request.action === 'summarizeTab') {
      summarizeTab(request.tab, request.apiKey)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => {
          console.error('Tab summarization error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (request.action === 'summarizeCategory') {
      summarizeCategory(request.tabs, request.categoryName, request.apiKey)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => {
          console.error('Category summarization error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (request.action === 'extractContent') {
      if (!request.tabId || !request.url) {
        sendResponse({ success: false, error: 'Missing tabId or url' });
        return true;
      }
      extractTabContent(request.tabId, request.url)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => {
          console.error('Content extraction error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (request.action === 'getTabMetadata') {
      const { tabId } = request;
      if (!tabId) {
        sendResponse({ success: false, error: 'Missing tabId' });
        return true;
      }

      // Get tab info and all tabs for duplicate detection
      chrome.tabs.get(tabId, async (tab) => {
        if (chrome.runtime.lastError) {
          console.warn(`Failed to get tab ${tabId}:`, chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        // Get all tabs for duplicate detection
        const allTabs = await chrome.tabs.query({});

        // Build full metadata object
        const lastAccessed = tabAccessTimes.get(tabId) || Date.now();
        const idleTime = Date.now() - lastAccessed;
        const idleMinutes = Math.round(idleTime / (60 * 1000));

        console.log(
          `🔍 Tab ${tabId} metadata: lastAccessed=${new Date(lastAccessed).toISOString()}, idle=${idleMinutes}min`
        );

        // Extract Jira status from page content
        console.log(`📞 About to call extractJiraStatus for tab ${tabId}, url: ${tab.url}`);
        const jiraStatus = await extractJiraStatus(tabId, tab.url || '');
        console.log(`📞 extractJiraStatus returned: ${jiraStatus}`);

        const metadata = {
          lastAccessed: lastAccessed,
          isSuspended: tab.discarded || false,
          duplicateCount: countDuplicates(tab, allTabs),
          jiraStatus: jiraStatus,
          // memoryUsage: undefined, // Requires chrome.processes API (dev channel only)
        };

        console.log(`✅ Tab ${tabId} metadata complete: jiraStatus=${jiraStatus}`);

        sendResponse({ success: true, data: metadata });
      });

      return true; // Keep channel open for async response
    }
  }
);

/**
 * Categorize tabs using Claude API with retry logic and validation
 */
async function categorizeTabs(
  tabs: chrome.tabs.Tab[] | undefined,
  apiKey: string | undefined
): Promise<CategoryResponse> {
  if (!tabs || !apiKey) {
    throw new Error('Missing required parameters');
  }
  const tabInfo = tabs.map((t, i) => `${i}: ${t.title} - ${t.url}`).join('\n');

  // Use retryWithValidation for automatic retry with exponential backoff and schema validation
  const apiCall = async () => {
    const response = await fetch(API_CONFIG.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_CONFIG.VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: API_CONFIG.MODEL,
        max_tokens: API_CONFIG.MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: buildPrompt(tabInfo),
          },
        ],
      }),
    });

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`API Error: ${response.status} - ${errorText}`);

      // Don't retry on authentication errors (401, 403)
      if (response.status === 401 || response.status === 403) {
        throw error;
      }

      // Throw retryable error for 429, 5xx
      if (isRetryableHttpError(response.status)) {
        throw error;
      }

      throw error;
    }

    return response.json();
  };

  // Validate response with ClaudeResponseSchema first
  const claudeResponse = await retryWithValidation(apiCall, ClaudeResponseSchema, {
    maxRetries: API_CONFIG.MAX_RETRIES,
    initialDelay: API_CONFIG.INITIAL_DELAY_MS,
    jitterPercent: API_CONFIG.JITTER_PERCENT,
    timeout: API_CONFIG.TIMEOUT_MS,
    onRetry: (error, attempt) => {
      console.log(`🔄 Retry attempt ${attempt}/${API_CONFIG.MAX_RETRIES}: ${error.message}`);
    },
  });

  // Parse and validate the categorization result
  return parseApiResponse(claudeResponse);
}

/**
 * Build the prompt for Claude API
 */
function buildPrompt(tabInfo: string): string {
  return `Categorize these browser tabs into logical groups (Work, Research, Shopping, Social, Entertainment, Development, News, Other).

CRITICAL: Your response must be ONLY a single-line JSON object. Do not include any explanations, comments, or text before or after the JSON.

Format (single line only):
{"Work":[0,1],"Research":[2,3],"Shopping":[4]}

Tabs (by index):
${tabInfo}

Return only the JSON object as a single line, nothing else:`;
}

/**
 * Parse and validate API response
 */
function parseApiResponse(data: ClaudeResponse): CategoryResponse {
  // ClaudeResponse already validated by Zod schema
  const rawText = data.content[0].text;
  console.log('Raw API response:', rawText);

  // Extract JSON from response (handles markdown code blocks and other text)
  let jsonText = rawText
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try to extract JSON object if response contains additional text
  const jsonMatch = jsonText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  // Fix common JSON issues from Claude
  jsonText = jsonText
    // Remove any control characters and unescaped newlines within strings
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    // Remove trailing commas before } and ]
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    // Ensure proper spacing
    .trim();

  console.log('Cleaned JSON:', jsonText);

  try {
    const categories = JSON.parse(jsonText);

    // Validate with Zod schema
    const validatedCategories = CategoryResponseSchema.parse(categories);

    console.log('✅ Validated categories:', validatedCategories);
    return validatedCategories;
  } catch (error) {
    console.error('Failed to parse JSON response:', jsonText);
    console.error('Original response:', rawText);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`JSON parsing error: ${errorMessage}. Please try again.`);
  }
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a URL can be accessed for content extraction
 * @param {string} url - The URL to check
 * @returns {boolean} True if URL is accessible
 */
function isAccessibleUrl(url: string): boolean {
  if (!url) return false;

  const protectedProtocols = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'file://',
    'view-source:',
    'data:',
    'javascript:',
  ];

  return !protectedProtocols.some((protocol) => url.startsWith(protocol));
}

/**
 * Get user-friendly error message for inaccessible URLs
 * @param {string} url - The inaccessible URL
 * @returns {string} Error message
 */
function getInaccessibleUrlMessage(url: string): string {
  if (!url) return 'Invalid URL';

  if (url.startsWith('chrome://') || url.startsWith('edge://')) {
    return 'Cannot summarize browser internal pages';
  }
  if (url.startsWith('chrome-extension://')) {
    return 'Cannot summarize extension pages';
  }
  if (url.startsWith('about:')) {
    return 'Cannot summarize about: pages';
  }
  if (url.startsWith('file://')) {
    return 'Cannot summarize local file:// pages';
  }
  if (url.startsWith('view-source:')) {
    return 'Cannot summarize view-source: pages';
  }

  return 'Cannot access this page for summarization';
}

/**
 * Extract content from a tab using content script injection
 * @param {number} tabId - Chrome tab ID
 * @param {string} url - Tab URL for validation
 * @returns {Promise<Object>} Extracted content data
 */
async function extractTabContent(tabId: number, url: string): Promise<ExtractedContent | null> {
  // Validate URL is accessible
  if (!isAccessibleUrl(url)) {
    throw new Error(getInaccessibleUrlMessage(url));
  }

  try {
    // Inject and execute content extraction script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content-extractor.js'],
    });

    if (!results || results.length === 0) {
      throw new Error('No content extraction results returned');
    }

    const extractedData = results[0].result as ExtractedContent;

    if (!extractedData || !extractedData.hasContent) {
      throw new Error('Unable to extract content from page');
    }

    return extractedData;
  } catch (error) {
    console.error('Content extraction failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract page content: ${errorMessage}`);
  }
}

/**
 * Summarize an individual tab using Claude API with extracted content
 * @param {Object} tab - Tab object with id, title, url
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<Object>} Tab summary
 */
async function summarizeTab(
  tab: chrome.tabs.Tab | undefined,
  apiKey: string | undefined
): Promise<TabSummary> {
  if (!tab || !apiKey || !tab.id || !tab.url || !tab.title) {
    throw new Error('Missing required parameters');
  }

  // Check if URL is accessible BEFORE trying to extract
  if (!isAccessibleUrl(tab.url)) {
    // Return a summary without content for protected pages
    return {
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
      summary: `Browser internal page (cannot analyze)`,
      timestamp: Date.now(),
      tokens: 0,
    };
  }

  try {
    // Step 1: Extract content from the tab
    const contentData = await extractTabContent(tab.id, tab.url);

    if (!contentData) {
      throw new Error('Failed to extract content');
    }

    // Build content string from extracted data
    const contentText = contentData.content || [
      ...contentData.headings.map(h => `Heading: ${h}`),
      ...contentData.paragraphs.slice(0, 5)
    ].join('\n');

    // Step 2: Build enhanced prompt with actual content
    const prompt = `Summarize this browser tab in 2-3 sentences. Focus on:
1. Main purpose/topic
2. Key information or actions available
3. Why someone might have this tab open

Tab Title: ${tab.title}
Tab URL: ${tab.url}
Page Content Preview: ${contentText}
${contentData.metaDescription ? `Meta Description: ${contentData.metaDescription}` : ''}

Provide a concise, actionable summary.`;

    // Step 3: Call Claude API with content
    const response = await fetch(
      API_CONFIG.BASE_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_CONFIG.VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: API_CONFIG.MODEL,
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid API response format');
    }

    const summary = data.content[0].text.trim();
    const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    // Step 4: Return structured summary
    return {
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
      summary: summary,
      timestamp: Date.now(),
      tokens: tokens,
    };
  } catch (error) {
    console.error('Failed to summarize tab:', error);
    throw error;
  }
}

/**
 * Summarize a category of tabs using Claude API with extracted content
 * @param {Array} tabs - Array of tab objects
 * @param {string} categoryName - Category name
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<Object>} Category summary
 */
async function summarizeCategory(
  tabs: chrome.tabs.Tab[] | undefined,
  categoryName: string | undefined,
  apiKey: string | undefined
): Promise<CategorySummary> {
  if (!tabs || !categoryName || !apiKey) {
    throw new Error('Missing required parameters');
  }

  try {
    // Step 1: Extract content from all tabs (with rate limiting)
    const tabsWithContent = [];

    for (const tab of tabs.slice(0, 10)) {
      // Limit to 10 tabs max
      if (!tab.id || !tab.url || !tab.title) {
        console.warn('Skipping tab with missing properties');
        continue;
      }

      // Check if URL is accessible before attempting extraction
      if (!isAccessibleUrl(tab.url)) {
        console.log(`Skipping protected URL: ${tab.url}`);
        tabsWithContent.push({
          title: tab.title,
          url: tab.url,
          contentPreview: '(Protected page - cannot access)',
        });
        continue;
      }

      try {
        const contentData = await extractTabContent(tab.id, tab.url);
        if (!contentData) {
          throw new Error('No content extracted');
        }

        // Build content string from extracted data
        const contentText = contentData.content || [
          ...contentData.headings.map(h => `Heading: ${h}`),
          ...contentData.paragraphs.slice(0, 3)
        ].join('\n');

        tabsWithContent.push({
          title: tab.title,
          url: tab.url,
          contentPreview: contentText.substring(0, 500), // Limit per-tab content
        });
      } catch (error) {
        console.warn(`Failed to extract content from tab ${tab.id}:`, error);
        // Include tab with error message
        const errorMessage = error instanceof Error ? error.message : 'Content unavailable';
        tabsWithContent.push({
          title: tab.title,
          url: tab.url,
          contentPreview: `(${errorMessage})`,
        });
      }

      // Small delay to avoid overwhelming the browser
      await sleep(100);
    }

    // Step 2: Build tab list with content
    const tabList = tabsWithContent
      .map((t, i) => `${i + 1}. ${t.title}\n   URL: ${t.url}\n   Preview: ${t.contentPreview}`)
      .join('\n\n');

    // Step 3: Build prompt
    const prompt = `Summarize this group of ${tabs.length} browser tabs in a single paragraph. Explain:
1. The common theme/purpose
2. Key topics or activities covered
3. Overall context of this browsing session

Category: ${categoryName}

Tabs:
${tabList}

Provide a cohesive summary that captures the essence of this tab collection.`;

    // Step 4: Call Claude API
    const response = await fetch(
      API_CONFIG.BASE_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_CONFIG.VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: API_CONFIG.MODEL,
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid API response format');
    }

    const summary = data.content[0].text.trim();
    const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    return {
      category: categoryName,
      summary: summary,
      tabCount: tabs.length,
      timestamp: Date.now(),
      tokens: tokens,
    };
  } catch (error) {
    console.error('Failed to summarize category:', error);
    throw error;
  }
}

// ============================================================================
// Tab Indexing for Search Feature
// ============================================================================

const INDEXED_TABS_KEY = 'indexed_tabs';
const MAX_CONTENT_LENGTH = 5000;
const INDEX_EXPIRY_HOURS = 24;

/**
 * Index a tab for search
 * @param {chrome.tabs.Tab} tab - Tab to index
 */
async function indexTabForSearch(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || !tab.url) return;

  // Skip protected URLs
  if (!isAccessibleUrl(tab.url)) {
    console.log(`Skipping protected URL: ${tab.url}`);
    return;
  }

  try {
    // Extract content
    const contentData = await extractTabContent(tab.id, tab.url);
    const content = contentData.content || '';

    // Truncate content if too long
    const truncatedContent =
      content.length > MAX_CONTENT_LENGTH
        ? content.substring(0, MAX_CONTENT_LENGTH) + '...'
        : content;

    // Create indexed tab entry
    const indexedTab = {
      tabId: tab.id,
      title: tab.title || '',
      url: tab.url,
      content: truncatedContent,
      contentHash: simpleHash(truncatedContent),
      lastAccessed: new Date().toISOString(),
      indexed: new Date().toISOString(),
    };

    // Get existing indexed tabs object
    const result = await chrome.storage.local.get(INDEXED_TABS_KEY);
    const existingTabs = result[INDEXED_TABS_KEY] || {};

    // Add/update this tab in the object
    existingTabs[tab.id] = indexedTab;

    // Store back to chrome.storage.local
    await chrome.storage.local.set({ [INDEXED_TABS_KEY]: existingTabs });

    console.log(`✅ Indexed tab ${tab.id}: ${tab.title}`);
  } catch (error) {
    console.warn(`Failed to index tab ${tab.id}:`, error.message);
  }
}

/**
 * Remove a tab from the search index
 * @param {number} tabId - Tab ID to remove
 */
async function removeIndexedTab(tabId: number): Promise<void> {
  try {
    const result = await chrome.storage.local.get(INDEXED_TABS_KEY);
    const tabs = result[INDEXED_TABS_KEY] || {};

    delete tabs[tabId];

    await chrome.storage.local.set({ [INDEXED_TABS_KEY]: tabs });
    console.log(`🗑️ Removed indexed tab ${tabId}`);
  } catch (error) {
    console.error(`Failed to remove indexed tab ${tabId}:`, error);
  }
}

/**
 * Clean up indexed tabs that no longer exist
 */
async function cleanupIndexedTabs(): Promise<void> {
  try {
    const allTabs = await chrome.tabs.query({});
    const activeTabIds = new Set(allTabs.map((t) => t.id).filter((id) => id !== undefined));

    const result = await chrome.storage.local.get(INDEXED_TABS_KEY);
    const indexed = result[INDEXED_TABS_KEY] || {};

    let cleaned = false;
    for (const tabIdStr in indexed) {
      const tabId = parseInt(tabIdStr);
      if (!activeTabIds.has(tabId)) {
        delete indexed[tabIdStr];
        cleaned = true;
      }
    }

    if (cleaned) {
      await chrome.storage.local.set({ [INDEXED_TABS_KEY]: indexed });
      console.log('🧹 Cleaned up old indexed tabs');
    }
  } catch (error) {
    console.error('Failed to cleanup indexed tabs:', error);
  }
}

/**
 * Simple hash function for change detection
 * @param {string} str - String to hash
 * @returns {string} Hash string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Check if a tab should be re-indexed
 * @param {chrome.tabs.Tab} tab - Tab to check
 * @returns {Promise<boolean>} True if tab needs re-indexing
 */
async function shouldReindexTab(tab: chrome.tabs.Tab): Promise<boolean> {
  if (!tab.id) return false;

  try {
    const result = await chrome.storage.local.get(INDEXED_TABS_KEY);
    const indexed = result[INDEXED_TABS_KEY] || {};
    const existing = indexed[tab.id];

    if (!existing) {
      return true; // Not indexed yet
    }

    // Check if URL changed
    if (existing.url !== tab.url) {
      return true;
    }

    // Check if content is stale (>24 hours)
    const indexedDate = new Date(existing.indexed);
    const age = Date.now() - indexedDate.getTime();
    const expiryMs = INDEX_EXPIRY_HOURS * 60 * 60 * 1000;

    if (age > expiryMs) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking if tab needs reindex:', error);
    return false;
  }
}

// ============================================================================
// Tab Event Listeners for Search Indexing
// ============================================================================

// Index new tabs (with delay to let page load)
chrome.tabs.onCreated.addListener(async (tab) => {
  console.log(`📝 Tab created: ${tab.id}`);
  // Wait 3 seconds for page to load before indexing
  setTimeout(() => {
    if (tab.id) {
      chrome.tabs
        .get(tab.id)
        .then(indexTabForSearch)
        .catch(() => {
          console.log(`Tab ${tab.id} was closed before indexing`);
        });
    }
  }, 3000);
});

// Re-index updated tabs (when page finishes loading)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log(`🔄 Tab updated: ${tabId}`);
    const needsReindex = await shouldReindexTab(tab);
    if (needsReindex) {
      await indexTabForSearch(tab);
    } else {
      console.log(`Tab ${tabId} is up to date, skipping reindex`);
    }
  }
});

// Remove closed tabs from index
chrome.tabs.onRemoved.addListener(async (tabId) => {
  console.log(`❌ Tab removed: ${tabId}`);
  await removeIndexedTab(tabId);
});

// Index all existing tabs on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('🚀 Extension startup - indexing existing tabs');
  await cleanupIndexedTabs();
  await initializeActivityTracking();

  const allTabs = await chrome.tabs.query({});
  console.log(`Found ${allTabs.length} existing tabs to index`);

  // Index tabs with staggered delays to avoid overwhelming the browser
  for (let i = 0; i < allTabs.length; i++) {
    const tab = allTabs[i];
    setTimeout(() => {
      if (tab.status === 'complete' && tab.url) {
        indexTabForSearch(tab);
      }
    }, i * 500); // 500ms delay between each tab
  }
});

// Also index on install (first time)
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`🎉 Extension ${details.reason} - indexing existing tabs`);
  await initializeActivityTracking();

  const allTabs = await chrome.tabs.query({});
  console.log(`Found ${allTabs.length} existing tabs to index`);

  // Index tabs with staggered delays
  for (let i = 0; i < allTabs.length; i++) {
    const tab = allTabs[i];
    setTimeout(() => {
      if (tab.status === 'complete' && tab.url) {
        indexTabForSearch(tab);
      }
    }, i * 500); // 500ms delay between each tab
  }
});

console.log('✅ Tab search indexing initialized');

// ============================================================================
// Tab Activity Tracking for Status Indicators
// ============================================================================

const TAB_ACCESS_TIMES_KEY = 'tab_access_times';
const tabAccessTimes = new Map();

// Load persisted access times from storage
async function loadAccessTimes(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(TAB_ACCESS_TIMES_KEY);
    const stored = result[TAB_ACCESS_TIMES_KEY] || {};

    // Convert stored object back to Map
    for (const [tabIdStr, timestamp] of Object.entries(stored)) {
      tabAccessTimes.set(parseInt(tabIdStr), timestamp);
    }

    console.log(`📥 Loaded ${tabAccessTimes.size} tab access times from storage`);
  } catch (error) {
    console.error('Failed to load tab access times:', error);
  }
}

// Save access times to storage
async function saveAccessTimes(): Promise<void> {
  try {
    // Convert Map to plain object for storage
    const toStore = {};
    for (const [tabId, timestamp] of tabAccessTimes.entries()) {
      toStore[tabId] = timestamp;
    }

    await chrome.storage.local.set({ [TAB_ACCESS_TIMES_KEY]: toStore });
  } catch (error) {
    console.error('Failed to save tab access times:', error);
  }
}

// Initialize activity tracking for all existing tabs on startup
async function initializeActivityTracking(): Promise<void> {
  await loadAccessTimes();

  const allTabs = await chrome.tabs.query({});
  const now = Date.now();

  console.log(`🕐 Initializing activity tracking for ${allTabs.length} tabs`);

  for (const tab of allTabs) {
    if (tab.id) {
      // If we don't have a stored time for this tab, set it to now
      if (!tabAccessTimes.has(tab.id)) {
        tabAccessTimes.set(tab.id, now);
      }

      // Always update the currently active tab to now
      if (tab.active) {
        tabAccessTimes.set(tab.id, now);
        console.log(`📍 Active tab ${tab.id} set to current time`);
      }
    }
  }

  await saveAccessTimes();
}

// Track when tabs are activated
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  tabAccessTimes.set(tabId, Date.now());
  console.log(`📍 Tab ${tabId} accessed at ${Date.now()}`);
  await saveAccessTimes();
});

// Track new tabs
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.id) {
    tabAccessTimes.set(tab.id, Date.now());
    await saveAccessTimes();
  }
});

// Clean up closed tabs
chrome.tabs.onRemoved.addListener(async (tabId) => {
  tabAccessTimes.delete(tabId);
  await saveAccessTimes();
});

/**
 * Count duplicates for a tab by URL
 * @param {chrome.tabs.Tab} tab - Tab to check
 * @param {Array<chrome.tabs.Tab>} allTabs - All open tabs
 * @returns {number} Number of tabs with same URL
 */
function countDuplicates(tab: chrome.tabs.Tab, allTabs: chrome.tabs.Tab[]): number {
  if (!tab.url) return 1;

  // Only remove hash fragment (# and after) for comparison
  // Keep query params because they often change content
  const normalizedUrl = tab.url.split('#')[0];
  let count = 0;

  for (const otherTab of allTabs) {
    if (otherTab.url) {
      const otherNormalized = otherTab.url.split('#')[0];
      if (normalizedUrl === otherNormalized) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Extract Jira status from page content
 * @param {number} tabId - Tab ID
 * @param {string} url - Tab URL
 * @returns {Promise<string|undefined>} Jira status or undefined
 */
async function extractJiraStatus(tabId: number, url: string): Promise<string | undefined> {
  console.log(`🔬 extractJiraStatus called for tab ${tabId}, url: ${url}`);

  if (!url || (!url.includes('jira') && !url.includes('atlassian'))) {
    console.log(`⏭️ Skipping tab ${tabId}: URL doesn't contain 'jira' or 'atlassian'`);
    return undefined;
  }

  // Only try to extract from Jira issue pages (with /browse/)
  if (!url.includes('/browse/')) {
    console.log(`⏭️ Skipping tab ${tabId}: URL doesn't contain '/browse/'`);
    return undefined;
  }

  console.log(`🔎 Attempting Jira status extraction for tab ${tabId}: ${url}`);

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['jira-content-extractor.js'],
    });

    console.log(`📦 Injection result for tab ${tabId}:`, results);

    if (results && results[0] && results[0].result) {
      console.log(`📊 Extraction result for tab ${tabId}:`, results[0].result);

      if (results[0].result.success) {
        const status = results[0].result.status || undefined;
        console.log(`✅ Jira status extracted for tab ${tabId}: ${status}`);
        return status;
      } else {
        console.warn(`❌ Extraction failed for tab ${tabId}:`, results[0].result.error);
      }
    } else {
      console.warn(`❌ No result from injection for tab ${tabId}`);
    }
  } catch (error) {
    console.error(`💥 Failed to inject Jira extractor into tab ${tabId}:`, error.message, error);
  }

  return undefined;
}
