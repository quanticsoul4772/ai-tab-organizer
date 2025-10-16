import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Categorize tabs endpoint
app.post('/api/categorize', async (req, res) => {
  try {
    const { tabs } = req.body;

    if (!tabs || !Array.isArray(tabs)) {
      return res.status(400).json({ error: 'Invalid tabs data' });
    }

    console.log(`Categorizing ${tabs.length} tabs...`);

    // For now, use a simple categorization
    // In production, this will call unified-thinking MCP tool
    const categories = await categorizeTabs(tabs);

    res.json({ 
      success: true, 
      categories,
      tabCount: tabs.length
    });
  } catch (error) {
    console.error('Categorization error:', error);
    res.status(500).json({ 
      error: 'Failed to categorize tabs',
      message: error.message 
    });
  }
});

// Simple categorization logic (will be replaced with unified-thinking)
async function categorizeTabs(tabs) {
  const categories = {
    'Work': [],
    'Research': [],
    'Shopping': [],
    'Social': [],
    'Entertainment': [],
    'Development': [],
    'Other': []
  };

  for (const tab of tabs) {
    const url = tab.url.toLowerCase();
    const title = tab.title.toLowerCase();

    // Simple keyword-based categorization
    if (url.includes('github') || url.includes('stackoverflow') || url.includes('localhost')) {
      categories['Development'].push(tab);
    } else if (url.includes('amazon') || url.includes('ebay') || url.includes('shop') || title.includes('buy')) {
      categories['Shopping'].push(tab);
    } else if (url.includes('facebook') || url.includes('twitter') || url.includes('linkedin') || url.includes('instagram')) {
      categories['Social'].push(tab);
    } else if (url.includes('youtube') || url.includes('netflix') || url.includes('spotify') || url.includes('twitch')) {
      categories['Entertainment'].push(tab);
    } else if (url.includes('docs.') || url.includes('wiki') || url.includes('medium') || url.includes('blog')) {
      categories['Research'].push(tab);
    } else if (url.includes('mail') || url.includes('calendar') || url.includes('drive') || url.includes('slack')) {
      categories['Work'].push(tab);
    } else {
      categories['Other'].push(tab);
    }
  }

  // Remove empty categories
  return Object.fromEntries(
    Object.entries(categories).filter(([_, tabs]) => tabs.length > 0)
  );
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Tab Organizer Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
