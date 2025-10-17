// Jira content extractor - extracts issue status from Jira pages
(function() {
  try {
    // Try multiple selectors for different Jira versions
    const selectors = [
      // Jira Cloud
      '[data-test-id="issue.views.field.status.status-field"]',
      '[data-testid="issue.views.field.status.status-field"]',
      'span[data-testid="issue.views.field.status.status-field"] span',
      // Jira Server/Data Center
      '#status-val span',
      '#status-val .value',
      'span#status-val',
      // Generic fallback
      '[id*="status"] span.value',
      'div[data-field-id="status"] span',
    ];

    let status = null;

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        status = element.textContent.trim();
        console.log(`Found Jira status: ${status} using selector: ${selector}`);
        break;
      }
    }

    // If still not found, try looking for common status badges
    if (!status) {
      const badges = document.querySelectorAll('span[class*="status"], span[class*="badge"]');
      for (const badge of badges) {
        const text = badge.textContent.trim();
        // Check if it matches common Jira statuses
        if (/^(To Do|In Progress|In Review|Done|Closed|Resolved|Open|Blocked|Reopened)$/i.test(text)) {
          status = text;
          console.log(`Found Jira status via badge: ${status}`);
          break;
        }
      }
    }

    return {
      success: true,
      status: status,
      url: window.location.href,
      title: document.title
    };
  } catch (error) {
    console.error('Jira content extraction error:', error);
    return {
      success: false,
      error: error.message,
      url: window.location.href
    };
  }
})();
