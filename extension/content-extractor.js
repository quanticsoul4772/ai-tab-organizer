/**
 * Content extractor script
 * Injected into tabs to extract readable content for summarization
 */

/**
 * Extract main text content from the page
 * @returns {Object} Extracted text content and metadata
 */
function extractPageContent() {
  try {
    // Get the main text content, excluding scripts, styles, etc.
    const bodyText = document.body.innerText || document.body.textContent || '';

    // Limit to first 5000 characters to avoid token limits
    const contentPreview = bodyText.substring(0, 5000).trim();

    // Get meta description as fallback/supplement
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';

    return {
      content: contentPreview,
      metaDescription: metaDescription,
      contentLength: bodyText.length,
      hasContent: contentPreview.length > 0
    };
  } catch (error) {
    console.error('Error extracting content:', error);
    return {
      content: '',
      metaDescription: '',
      contentLength: 0,
      hasContent: false,
      error: error.message
    };
  }
}

// Execute extraction and return result
extractPageContent();
