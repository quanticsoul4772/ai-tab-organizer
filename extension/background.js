// Background service worker for AI Tab Organizer

const API_CONFIG = {
  BASE_URL: 'https://api.anthropic.com/v1/messages',
  MODEL: 'claude-3-5-sonnet-20241022',
  MAX_TOKENS: 1024,
  VERSION: '2023-06-01',
  TIMEOUT_MS: 30000, // 30 seconds
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000,
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'categorize') {
    categorizeTabs(request.tabs, request.apiKey)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => {
        console.error('Categorization error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
});

/**
 * Categorize tabs using Claude API with retry logic
 * @param {Array} tabs - Array of tab objects
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<Object>} Category mapping
 */
async function categorizeTabs(tabs, apiKey) {
  const tabInfo = tabs.map((t, i) => `${i}: ${t.title} - ${t.url}`).join('\n');

  let lastError;
  for (let attempt = 0; attempt <= API_CONFIG.MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${API_CONFIG.MAX_RETRIES}`);
        await sleep(API_CONFIG.RETRY_DELAY_MS * attempt);
      }

      const result = await fetchWithTimeout(
        API_CONFIG.BASE_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': API_CONFIG.VERSION,
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: API_CONFIG.MODEL,
            max_tokens: API_CONFIG.MAX_TOKENS,
            messages: [{
              role: 'user',
              content: buildPrompt(tabInfo)
            }]
          })
        },
        API_CONFIG.TIMEOUT_MS
      );

      if (!result.ok) {
        const errorText = await result.text();
        const error = new Error(`API Error: ${result.status} - ${errorText}`);

        // Don't retry on authentication errors
        if (result.status === 401 || result.status === 403) {
          throw error;
        }

        lastError = error;
        continue;
      }

      const data = await result.json();
      return parseApiResponse(data);
    } catch (error) {
      lastError = error;

      // Don't retry on timeout or network errors beyond max retries
      if (error.name === 'AbortError') {
        console.error('Request timeout');
      }

      // If this is the last attempt, throw the error
      if (attempt === API_CONFIG.MAX_RETRIES) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

/**
 * Build the prompt for Claude API
 * @param {string} tabInfo - Formatted tab information
 * @returns {string} Prompt text
 */
function buildPrompt(tabInfo) {
  return `Categorize these browser tabs into logical groups (Work, Research, Shopping, Social, Entertainment, Development, News, Other). Return ONLY valid JSON in this format:
{"Work": [0,1], "Research": [2,3], "Shopping": [4]}

Tabs (by index):
${tabInfo}

Return ONLY the JSON object, no other text.`;
}

/**
 * Parse and validate API response
 * @param {Object} data - API response data
 * @returns {Object} Parsed category mapping
 */
function parseApiResponse(data) {
  // Validate response structure
  if (!data.content || !data.content[0] || !data.content[0].text) {
    console.error('Unexpected API response:', data);
    throw new Error('Invalid API response format');
  }

  // Extract JSON from response (handles markdown code blocks)
  const jsonText = data.content[0].text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const categories = JSON.parse(jsonText);

    // Validate that all values are arrays of numbers
    for (const [category, indices] of Object.entries(categories)) {
      if (!Array.isArray(indices)) {
        throw new Error(`Category "${category}" does not contain an array`);
      }
      if (!indices.every(i => typeof i === 'number')) {
        throw new Error(`Category "${category}" contains non-numeric indices`);
      }
    }

    return categories;
  } catch (error) {
    console.error('Failed to parse JSON response:', jsonText);
    throw new Error(`JSON parsing error: ${error.message}`);
  }
}

/**
 * Fetch with timeout support
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
