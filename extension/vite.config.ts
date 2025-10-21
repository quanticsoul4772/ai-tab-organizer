import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      closeBundle() {
        // Ensure dist exists
        if (!existsSync('dist')) {
          mkdirSync('dist', { recursive: true });
        }

        // Copy manifest.json
        copyFileSync('manifest.json', 'dist/manifest.json');

        // Copy content-extractor.js
        copyFileSync('content-extractor.js', 'dist/content-extractor.js');

        // Copy jira-content-extractor.js
        copyFileSync('jira-content-extractor.js', 'dist/jira-content-extractor.js');

        console.log('✅ Extension files copied to dist/');
      },
    },
  ],
  resolve: {
    alias: {
      '@components': resolve(__dirname, 'src/components'),
      '@services': resolve(__dirname, 'src/services'),
      '@schemas': resolve(__dirname, 'src/schemas'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@core': resolve(__dirname, 'src/core'),
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        format: 'es',
        manualChunks: (id, api) => {
          // Check if this module is imported by background.ts
          const moduleInfo = api.getModuleInfo(id);
          if (!moduleInfo) return;

          // Check all importers recursively
          const isUsedByBackground = (moduleId) => {
            const info = api.getModuleInfo(moduleId);
            if (!info) return false;

            // If this is the background entry, we found it
            if (moduleId.includes('background.ts')) return true;

            // Check all importers
            for (const importer of info.importers) {
              if (isUsedByBackground(importer)) return true;
            }
            return false;
          };

          // If used by background, inline it (return undefined)
          if (isUsedByBackground(id)) {
            return undefined;
          }
        },
      },
    },
    minify: 'esbuild',
  },
});
