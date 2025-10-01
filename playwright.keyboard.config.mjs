import { defineConfig } from '@playwright/test';
import base from './playwright.config.mjs';

export default defineConfig({
  ...base,
  testMatch: '**/keyboard-accessibility.spec.mjs',
  outputDir: 'work/qa/keyboard-results',
  reporter: [['line'], ['json', { outputFile: 'work/qa/keyboard-results.json' }]],
  projects: ['firefox', 'webkit'].flatMap(browserName => [1440, 390].flatMap(width => ['light', 'dark'].map(colorScheme => ({
    name: `${browserName}-${width}-${colorScheme}`,
    use: { browserName, viewport: { width, height: 900 }, colorScheme,
      isMobile: browserName === 'webkit' && width < 992, hasTouch: browserName === 'webkit' && width < 992 }
  }))))
});
