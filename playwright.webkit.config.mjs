import { defineConfig } from '@playwright/test';
import base from './playwright.config.mjs';

// Optional engine check; the normal deployment gate continues to run Chromium.
export default defineConfig({
  ...base,
  testMatch: ['**/page-transitions.spec.mjs', '**/arrow-controls.spec.mjs'],
  outputDir: 'work/qa/webkit-motion-results',
  reporter: [['line'], ['json', { outputFile: 'work/qa/webkit-motion.json' }]],
  projects: [390, 820].flatMap(width => ['light', 'dark'].map(colorScheme => ({
    name: `webkit-${width}-${colorScheme}`,
    use: { browserName: 'webkit', viewport: { width, height: 900 }, isMobile: true, hasTouch: true, colorScheme }
  })))
});
