import { defineConfig } from '@playwright/test';

const projects = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
  { name: 'small-mobile', viewport: { width: 320, height: 700 }, isMobile: true }
].flatMap(device => ['light', 'dark'].map(colorScheme => ({
  name: `${device.name}-${colorScheme}`,
  use: { browserName: 'chromium', viewport: device.viewport, isMobile: device.isMobile, hasTouch: device.isMobile, colorScheme }
})));

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  timeout: 30000,
  expect: { timeout: 7000 },
  outputDir: 'work/qa/browser-results',
  reporter: [
    ['line'],
    ['html', { outputFolder: 'work/qa/report', open: 'never' }],
    ['junit', { outputFile: 'work/qa/junit.xml' }],
    ['json', { outputFile: 'work/qa/results.json' }]
  ],
  use: { reducedMotion: 'reduce', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  projects
});
