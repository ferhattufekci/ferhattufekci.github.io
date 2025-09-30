import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { browser, load } from './helpers/browser-dom.js';

const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const template = source.match(/<template id="sync-badge-template">([\s\S]*?)<\/template>/)[1];

function cardFor(platform, records) {
  const { win, window, document } = browser(template);
  load('sync-cards.js', { window: win, document, navigator: { language: 'en-US' }, URL, Image: window.Image });
  const card = document.querySelector('.sync-card');
  win.PortfolioSyncCards.populate(card, 'badge', platform, '14:00', records);
  return card;
}

test('Medium compares feed and snapshot dates, keeps the title as text and drops a broken cover independently', () => {
  const url = 'https://medium.com/@ferhattufekci/new';
  const cover = 'https://cdn-images-1.medium.com/cover.png';
  const card = cardFor('Medium', [
    { title: 'Older', date: '2025-01-01', url },
    { title: 'SLI < SLO', pubDate: 'Fri, 13 Feb 2026 20:01:58 GMT', link: url, thumbnail: cover },
    { title: 'Unusable link', date: '2027-01-01', url: 'about:blank' },
    { title: 'Unusable date', date: 'unknown', url },
  ]);
  assert.equal(card.querySelector('.sync-card-latest').hidden, false);
  assert.equal(card.querySelector('.sync-card-title').textContent, 'SLI < SLO');
  const entry = card.querySelector('.sync-card-entry');
  assert.equal(entry.href, url);
  const image = entry.querySelector('img');
  assert.equal(image.src, cover);
  image.dispatchEvent(new image.ownerDocument.defaultView.Event('error'));
  assert.equal(entry.querySelector('img'), null);
  assert.equal(entry.href, url);
});

test('GitHub uses the push time before the update time and accepts the normalized push timestamp', () => {
  const url = 'https://github.com/ferhattufekci/';
  const card = cardFor('GitHub', [
    { name: 'older', html_url: url + 'older', pushed_at: '2025-01-01', updated_at: '2027-01-01' },
    { name: 'normalized', url: url + 'normalized', updatedAt: '2025-12-01' },
    { name: 'newest', html_url: url + 'newest', updated_at: '2026-01-01' },
  ]);
  assert.equal(card.querySelector('.sync-card-title').textContent, 'newest');
  assert.equal(card.querySelector('.sync-card-entry').href, url + 'newest');
});

test('missing or incomplete records leave just the profile header and sync time visible', () => {
  for (const records of [undefined, [], [null, { name: 'Undated', url: 'https://github.com/example' }]]) {
    const card = cardFor('GitHub', records);
    assert.equal(card.querySelector('.sync-card-latest').hidden, true);
    assert.equal(card.querySelector('.sync-card-profile').href, 'https://github.com/ferhattufekci');
    assert.equal(card.querySelector('.sync-card-sync').textContent, 'Last repo sync · 14:00');
  }
});
