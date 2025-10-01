import { defineConfig } from '@playwright/test';
export default defineConfig({ reporter: [
  ['html', { outputFolder: 'work/qa/merged-report', open: 'never' }],
  ['junit', { outputFile: 'work/qa/merged-junit.xml' }],
  ['json', { outputFile: 'work/qa/merged-results.json' }]
] });
