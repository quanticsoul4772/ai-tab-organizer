# Quick Start Guide

## Step 1: Install Backend Dependencies

```bash
cd C:\Development\Projects\ai-tab-organizer\backend
npm install
```

## Step 2: Install Extension Dependencies

```bash
cd C:\Development\Projects\ai-tab-organizer\extension
npm install
```

## Step 3: Start the Backend Server

```bash
cd C:\Development\Projects\ai-tab-organizer\backend
npm start
```

You should see:
```
🚀 AI Tab Organizer Backend running on http://localhost:3000
📊 Health check: http://localhost:3000/health
```

## Step 4: Build the Extension

```bash
cd C:\Development\Projects\ai-tab-organizer\extension
npm run build
```

This creates a `dist` folder with the built extension.

## Step 5: Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right corner)
4. Click "Load unpacked"
5. Navigate to `C:\Development\Projects\ai-tab-organizer\extension\dist`
6. Select the folder
7. Extension should now appear in your toolbar

## Step 6: Test It Out

1. Open several tabs in Chrome (at least 10-15 for a good test)
2. Click the extension icon in your toolbar
3. You should see your tabs organized by category!

## Troubleshooting

**Extension doesn't load:**
- Make sure you ran `npm run build` in the extension folder
- Check that you selected the `dist` folder, not the `extension` folder
- Look at Chrome's extension error console for details

**Backend not responding:**
- Make sure the backend server is running on port 3000
- Check `http://localhost:3000/health` in your browser
- Look at the backend console for errors

**Tabs not categorizing:**
- Open browser console in the extension popup (right-click popup → Inspect)
- Check for CORS errors
- Verify backend is running

## Next Steps

Once everything is working:
1. Test with different types of tabs
2. Try the categorization with real browsing patterns
3. We'll integrate the unified-thinking MCP tool next for smarter AI categorization

## Development Mode

For active development with hot reload:

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Extension):
```bash
cd extension
npm run dev
```

Then load the extension from the `dist` folder and it will update as you make changes!
