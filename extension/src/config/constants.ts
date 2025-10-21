/**
 * Application-wide constants and configuration values
 */

/**
 * Tab indexing and search configuration
 */
export const TAB_CONFIG = {
  /** Maximum length of content to store in index */
  MAX_CONTENT_LENGTH: 5000,
  /** Hours before indexed content expires */
  INDEX_EXPIRY_HOURS: 24,
  /** Milliseconds to wait before indexing a newly created tab */
  INDEX_DELAY_MS: 3000,
  /** Maximum number of tabs to include in category summary */
  MAX_SUMMARY_TABS: 10,
  /** Number of concurrent tab operations (indexing, extraction) */
  CONCURRENT_OPERATIONS: 5,
  /** Delay between sequential content extractions (ms) */
  CONTENT_EXTRACTION_DELAY_MS: 100,
} as const;

/**
 * API configuration for Claude/Anthropic
 */
export const API_CONFIG = {
  /** Anthropic API base URL */
  BASE_URL: 'https://api.anthropic.com/v1/messages',
  /** Default model to use */
  MODEL: 'claude-3-5-sonnet-20241022',
  /** Maximum tokens for responses */
  MAX_TOKENS: 1024,
  /** API version header value */
  VERSION: '2023-06-01',
  /** Request timeout in milliseconds */
  TIMEOUT_MS: 30000,
  /** Maximum number of retry attempts */
  MAX_RETRIES: 3,
  /** Initial delay for exponential backoff (ms) */
  INITIAL_DELAY_MS: 1000,
  /** Maximum delay for exponential backoff (ms) */
  MAX_DELAY_MS: 30000,
  /** Jitter percentage for retry delays */
  JITTER_PERCENT: 30,
} as const;

/**
 * Storage configuration
 */
export const STORAGE_CONFIG = {
  /** Cache duration for summaries (24 hours in milliseconds) */
  CACHE_DURATION: 24 * 60 * 60 * 1000,
  /** Storage keys */
  KEYS: {
    API_KEY: 'anthropicApiKey',
    SUMMARY_CACHE: 'summaryCache',
    SUMMARY_SETTINGS: 'summarySettings',
    JIRA_SETTINGS: 'jiraSettings',
    DENSITY_MODE: 'densityMode',
    GROUP_STATES: 'groupStates',
    SESSIONS: 'sessions',
    INDEXED_TABS: 'indexed_tabs',
    TAB_ACCESS_TIMES: 'tab_access_times',
  },
} as const;

/**
 * UI configuration
 */
export const UI_CONFIG = {
  /** Number of tabs to show before enabling virtual scrolling */
  VIRTUAL_SCROLL_THRESHOLD: 50,
  /** Number of items to render in viewport for virtual scrolling */
  VIRTUAL_SCROLL_OVERSCAN: 5,
  /** Animation duration for collapse/expand (ms) */
  ANIMATION_DURATION_MS: 200,
  /** Debounce delay for search input (ms) */
  SEARCH_DEBOUNCE_MS: 300,
  /** Throttle delay for scroll events (ms) */
  SCROLL_THROTTLE_MS: 100,
} as const;

/**
 * Jira configuration
 */
export const JIRA_CONFIG = {
  /** Common Jira URL patterns */
  URL_PATTERNS: {
    CLOUD: /https?:\/\/[a-zA-Z0-9-]+\.atlassian\.net/,
    SERVER: /\/jira\//,
    BROWSE: /\/browse\//,
  },
  /** Jira issue key pattern */
  ISSUE_KEY_PATTERN: /([A-Z][A-Z0-9_]+-\d+)/,
} as const;

/**
 * Performance thresholds and limits
 */
export const PERFORMANCE_CONFIG = {
  /** Maximum time for tab categorization (ms) */
  MAX_CATEGORIZATION_TIME_MS: 5000,
  /** Maximum time for single tab search (ms) */
  MAX_SEARCH_TIME_MS: 100,
  /** Maximum memory usage warning threshold (MB) */
  MEMORY_WARNING_THRESHOLD_MB: 100,
  /** Batch size for bulk operations */
  BULK_OPERATION_BATCH_SIZE: 50,
} as const;

/**
 * Feature flags and experimental features
 */
export const FEATURES = {
  /** Enable Sentry error tracking */
  SENTRY_ENABLED: Boolean(process.env.VITE_SENTRY_DSN),
  /** Enable performance monitoring */
  PERFORMANCE_MONITORING: process.env.VITE_ENABLE_PERF_MONITORING === 'true',
  /** Enable debug logging */
  DEBUG_LOGGING: process.env.NODE_ENV === 'development',
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  API_KEY_MISSING: 'API key not configured. Please add your Anthropic API key in settings.',
  API_REQUEST_FAILED: 'Failed to communicate with AI service. Please try again.',
  TAB_ACCESS_DENIED: 'Cannot access this tab. Browser internal pages are protected.',
  CONTENT_EXTRACTION_FAILED: 'Failed to extract content from page.',
  STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded. Please clear cache or remove old sessions.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  INVALID_RESPONSE: 'Received invalid response from AI service.',
} as const;

/**
 * URL prefixes that cannot be accessed by content scripts
 */
export const PROTECTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'file://',
  'view-source:',
  'data:',
  'javascript:',
] as const;

/**
 * Regex patterns for validation
 */
export const VALIDATION_PATTERNS = {
  /** Anthropic API key format */
  ANTHROPIC_API_KEY: /^sk-ant-/,
  /** OpenAI API key format */
  OPENAI_API_KEY: /^sk-(?!ant-)/,
  /** Google API key format */
  GOOGLE_API_KEY: /^AIza/,
  /** URL validation */
  HTTP_URL: /^https?:\/\/.+/,
} as const;

/**
 * HTTP status codes we should retry on
 */
export const RETRYABLE_HTTP_CODES = [
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
] as const;

/**
 * Density mode breakpoints (number of tabs)
 */
export const DENSITY_BREAKPOINTS = {
  /** Use compact mode when tab count exceeds this */
  COMPACT_THRESHOLD: 50,
  /** Use normal mode when tab count is below this */
  NORMAL_THRESHOLD: 20,
} as const;
