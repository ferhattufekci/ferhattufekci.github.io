// Deliberately unsorted snapshots: expectations in the specs state the visible order.
const article = (title, lang, day) => ({
  title, lang, date: `2026-01-${day}T12:00:00Z`,
  url: `https://medium.com/@fixture/${title.toLowerCase().replaceAll(' ', '-')}`,
  excerpt: `${title} fixture article.`, thumbnail: null
});

export const articles = {
  systems: [article('Systems TR', 'tr', '01'), article('Systems EN', 'en', '06')],
  test: [article('Testing EN', 'en', '02'), article('Testing TR', 'tr', '05')],
  software: [article('Software TR', 'tr', '03'), article('Software EN', 'en', '04')]
};

export const repo = (name, category = 'software', pinned = false) => ({
  name, category, pinned, url: `https://github.com/fixture/${name}`,
  owner: 'fixture', description: `${name} repository`, topics: ['fixture'],
  language: 'JavaScript', lang: 'en', stars: 2, forks: 1
});

export const repositories = [
  repo('systems-pinned', 'systems', true), repo('systems-rest', 'systems'),
  repo('testing-pinned', 'test', true), repo('software-rest', 'software')
];

export const starred = count => Array.from({ length: count }, (_, i) => repo(`star-${i + 1}`));

export function catalog(overrides = {}) {
  return {
    'medium-systems.json': articles.systems,
    'medium-test.json': articles.test,
    'medium-software.json': articles.software,
    'github-repos.json': repositories,
    'github-starred.json': [],
    'meta.json': {}, 'github-meta.json': {},
    ...overrides
  };
}

export async function mockCatalog(page, overrides = {}) {
  const snapshots = catalog(overrides);
  await page.route('**/data/*.json', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    if (!(name in snapshots)) throw new Error(`Unexpected catalog request: ${name}`);
    const value = snapshots[name];
    if (value === 'network-error') return route.abort('failed');
    if (value === 'malformed-json') return route.fulfill({ contentType: 'application/json', body: '{' });
    return route.fulfill({ json: value });
  });
}
