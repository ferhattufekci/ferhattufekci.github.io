import { test, expect, expectSection, navigateToSection } from './fixtures.mjs';
import { mockCatalog, repo, starred } from './data/catalog.mjs';

const blogGroups = {
  all: 'category_all', systems: 'category_system_engineering',
  test: 'category_testing', software: 'category_software-development'
};
const projectGroups = { all: 'proj_all', systems: 'proj_systems', test: 'proj_test', software: 'proj_software' };
const titles = page => page.locator('#blog-grid .blog-article-title');
const names = (page, area) => page.locator(`#${area} .proj-name-text`);
// Independent expected facts shared by the single-page and cross-page decision tables.
const expectedArticles = {
  all: {
    all: ['Systems EN', 'Testing TR', 'Software EN', 'Software TR', 'Testing EN', 'Systems TR'],
    tr: ['Testing TR', 'Software TR', 'Systems TR'], en: ['Systems EN', 'Software EN', 'Testing EN']
  },
  systems: { all: ['Systems EN', 'Systems TR'], tr: ['Systems TR'], en: ['Systems EN'] },
  test: { all: ['Testing TR', 'Testing EN'], tr: ['Testing TR'], en: ['Testing EN'] },
  software: { all: ['Software EN', 'Software TR'], tr: ['Software TR'], en: ['Software EN'] }
};

async function press(button) {
  // Native buttons must also work without a pointer, including scrolled mobile bars.
  await button.focus();
  await button.press('Space');
}

async function selectCategory(page, section, category) {
  const [id, groups] = section === 'blog' ? ['blog-filters', blogGroups] : ['proj-filters', projectGroups];
  await press(page.locator(`#${id} button[data-group="${groups[category]}"]`));
  await expectSelection(page, section, category);
}

async function expectSelection(page, section, category) {
  const [id, groups] = section === 'blog' ? ['blog-filters', blogGroups] : ['proj-filters', projectGroups];
  await expect(page.locator(`#${id} [aria-pressed="true"]`)).toHaveCount(1);
  await expect(page.locator(`#${id} li.active button`)).toHaveAttribute('data-group', groups[category]);
  await expect(page.locator(`#${id} [data-group="${groups[category]}"]`)).toHaveAttribute('aria-pressed', 'true');
}

async function selectLanguage(page, language) {
  await press(page.locator(`#blog-lang-toggle [data-lang-filter="${language}"]`));
  await expect(page.locator('#blog-lang-toggle [aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('#blog-lang-toggle [aria-pressed="true"]')).toHaveAttribute('data-lang-filter', language);
  await expect(page.locator('#blog-lang-toggle .active')).toHaveCount(1);
  await expect(page.locator('#blog-lang-toggle .active')).toHaveAttribute('data-lang-filter', language);
}

async function openCatalog(page, section, overrides) {
  await mockCatalog(page, overrides);
  await page.goto(`/#${section}`);
  await expectSection(page, section);
  await expect(page.locator('.preloader')).toHaveCount(0);
}

test('R-FILTER-01 | Given bilingual articles, when each category/language pair is chosen, then only matching newest-first cards appear', async ({ page }) => {
  await openCatalog(page, 'blog');
  for (const [category, expected] of Object.entries(expectedArticles)) {
    await selectCategory(page, 'blog', category);
    for (const language of ['all', 'tr', 'en']) {
      await test.step(`When category=${category}, language=${language}`, async () => {
        await selectLanguage(page, language);
        await expect(titles(page)).toHaveText(expected[language]);
        await expect(page.locator('#blog-empty')).toBeHidden();
        await expect(page.locator('#blog-grid .blog-language-badge')).toHaveCount(language === 'all' ? expected[language].length : 0);
        await expect(page.locator('#blog-grid .blog-article-category')).toHaveCount(category === 'all' ? expected[language].length : 0);
        await expectSelection(page, 'projects', 'all');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      });
    }
  }
  await page.evaluate(() => window.setBlogLang('unsupported'));
  await expect(titles(page)).toHaveText(['Software EN']);
});

test('R-FILTER-02 | Given mixed pinned and ordinary repos, when all project categories are chosen, then each group and label is correct', async ({ page }) => {
  await openCatalog(page, 'projects');
  for (const [category, pinned, rest, label] of [
    ['all', ['systems-pinned', 'testing-pinned'], ['systems-rest', 'software-rest'], ''],
    ['systems', ['systems-pinned'], ['systems-rest'], 'Systems Engineering & Business Analysis'],
    ['test', ['testing-pinned'], [], 'Test Engineering'],
    ['software', [], ['software-rest'], 'Software Engineering'],
    ['all', ['systems-pinned', 'testing-pinned'], ['systems-rest', 'software-rest'], '']
  ]) {
    await selectCategory(page, 'projects', category);
    await expect(names(page, 'proj-pinned')).toHaveText(pinned);
    await expect(names(page, 'proj-grid')).toHaveText(rest);
    if (pinned.length) {
      await expect(page.locator('#proj-pinned-wrap')).toBeVisible();
      await expect(page.locator('#proj-pinned-label')).toHaveText(`📌 PINNED${label ? ` — ${label}` : ''}`);
    } else await expect(page.locator('#proj-pinned-wrap')).toBeHidden();
    if (rest.length) await expect(page.locator('#proj-all-wrap')).toBeVisible();
    else await expect(page.locator('#proj-all-wrap')).toBeHidden();
    await expectSelection(page, 'blog', 'all');
  }
});

test('R-FILTER-03 | Given both page selections, when navigating and using history, then category, language and starred progress stay independent', async ({ page }) => {
  await openCatalog(page, 'blog', { 'github-starred.json': starred(41) });
  await selectCategory(page, 'blog', 'test');
  await selectLanguage(page, 'tr');
  await navigateToSection(page, 'projects');
  await expectSelection(page, 'projects', 'all');
  await selectCategory(page, 'projects', 'systems');
  await page.locator('#proj-starred-more-btn').click();
  await expect(names(page, 'proj-starred-grid')).toHaveCount(40);
  await navigateToSection(page, 'blog');
  await expectSelection(page, 'blog', 'test');
  await expect(titles(page)).toHaveText(['Testing TR']);
  await selectCategory(page, 'blog', 'software');
  await selectLanguage(page, 'en');
  await page.goBack();
  await expectSection(page, 'projects');
  await expectSelection(page, 'projects', 'systems');
  await expect(names(page, 'proj-pinned')).toHaveText(['systems-pinned']);
  await expect(names(page, 'proj-starred-grid')).toHaveCount(40);
  await page.goForward();
  await expectSection(page, 'blog');
  await expect(titles(page)).toHaveText(['Software EN']);
  await page.locator('.theme-toggle-btn:visible').click();
  await expectSelection(page, 'blog', 'software');
  await expectSelection(page, 'projects', 'systems');
  await navigateToSection(page, 'projects');
  await selectCategory(page, 'projects', 'all');
  await navigateToSection(page, 'blog');
  await expect(titles(page)).toHaveText(['Software EN']);
});

test('R-FILTER-04 | Given a category with no articles in a language, when filtering and recovering, then stale cards disappear and the other page stays unchanged', async ({ page }) => {
  await openCatalog(page, 'blog', { 'medium-software.json': [
    { title: 'Only TR', lang: 'tr', url: 'https://medium.com/@fixture/only-tr' }
  ] });
  await selectCategory(page, 'blog', 'software');
  await selectLanguage(page, 'en');
  await expect(titles(page)).toHaveCount(0);
  await expect(page.locator('#blog-empty')).toBeVisible();
  await expect(page.locator('#blog-loading')).toBeHidden();
  await navigateToSection(page, 'projects');
  await selectCategory(page, 'projects', 'test');
  await navigateToSection(page, 'blog');
  await expect(page.locator('#blog-empty')).toBeVisible();
  await selectLanguage(page, 'all');
  await expect(titles(page)).toHaveText(['Only TR']);
  await expect(page.locator('#blog-empty')).toBeHidden();
  await expectSelection(page, 'projects', 'test');
});

test('R-FILTER-05 | Given no repos in a selected category, when returning to All, then pinned and ordinary cards recover without duplicates', async ({ page }) => {
  await openCatalog(page, 'projects', { 'github-repos.json': [repo('systems-only', 'systems', true)] });
  for (const category of ['test', 'software']) {
    await selectCategory(page, 'projects', category);
    await expect(page.locator('#proj-empty')).toBeVisible();
    await expect(page.locator('#proj-pinned-wrap')).toBeHidden();
    await expect(page.locator('#proj-all-wrap')).toBeHidden();
  }
  await selectCategory(page, 'projects', 'all');
  await expect(names(page, 'proj-pinned')).toHaveText(['systems-only']);
  await expect(page.locator('#proj-empty')).toBeHidden();
  await navigateToSection(page, 'blog');
  await selectCategory(page, 'blog', 'software');
  await navigateToSection(page, 'projects');
  await expect(names(page, 'proj-pinned')).toHaveText(['systems-only']);
});

test('R-FILTER-06 | Given unknown repository metadata, when selecting Software, then cards use their declared fallback category', async ({ page }) => {
  await openCatalog(page, 'projects', { 'github-repos.json': [
    repo('future-category', 'future'), repo('missing-category', null), repo('prototype-category', '__proto__')
  ] });
  await expect(names(page, 'proj-grid')).toHaveCount(3);
  await selectCategory(page, 'projects', 'software');
  await expect(names(page, 'proj-grid')).toHaveText(['future-category', 'missing-category', 'prototype-category']);
  await expect(page.locator('#proj-empty')).toBeHidden();
});

test('R-FILTER-10 | Given independent catalogs, when all 48 category/language state combinations occur, then each page retains its own selection', async ({ page }) => {
  await openCatalog(page, 'projects');
  const expectedProjects = {
    all: [['systems-pinned', 'testing-pinned'], ['systems-rest', 'software-rest']],
    systems: [['systems-pinned'], ['systems-rest']],
    test: [['testing-pinned'], []], software: [[], ['software-rest']]
  };
  for (const projectCategory of Object.keys(projectGroups)) {
    await selectCategory(page, 'projects', projectCategory);
    await navigateToSection(page, 'blog');
    for (const blogCategory of Object.keys(blogGroups)) {
      await selectCategory(page, 'blog', blogCategory);
      for (const language of ['all', 'tr', 'en']) {
        await test.step(`Projects=${projectCategory}; Blog=${blogCategory}; language=${language}`, async () => {
          await selectLanguage(page, language);
          await expect(titles(page)).toHaveText(expectedArticles[blogCategory][language]);
          await expect(names(page, 'proj-pinned')).toHaveText(expectedProjects[projectCategory][0]);
          await expect(names(page, 'proj-grid')).toHaveText(expectedProjects[projectCategory][1]);
          await expectSelection(page, 'projects', projectCategory);
        });
      }
    }
    await navigateToSection(page, 'projects');
    await expectSelection(page, 'projects', projectCategory);
    await expect(names(page, 'proj-pinned')).toHaveText(expectedProjects[projectCategory][0]);
    await expect(names(page, 'proj-grid')).toHaveText(expectedProjects[projectCategory][1]);
    await expectSelection(page, 'blog', 'software');
  }
});

test('R-FILTER-11 | Given all catalogs and RSS unavailable, when every category is selected, then settled empty states remain usable', async ({ page }) => {
  await openCatalog(page, 'blog', {
    'medium-systems.json': [], 'medium-test.json': [], 'medium-software.json': [],
    'github-repos.json': []
  });
  for (const category of Object.keys(blogGroups)) {
    await selectCategory(page, 'blog', category);
    for (const language of ['all', 'tr', 'en']) {
      await selectLanguage(page, language);
      await expect(page.locator('#blog-empty')).toBeVisible();
      await expect(page.locator('#blog-loading')).toBeHidden();
      await expect(titles(page)).toHaveCount(0);
    }
  }
  await navigateToSection(page, 'projects');
  for (const category of Object.keys(projectGroups)) {
    await selectCategory(page, 'projects', category);
    await expect(page.locator('#proj-empty')).toBeVisible();
    await expect(page.locator('#proj-loading')).toBeHidden();
    await expectSelection(page, 'blog', 'software');
  }
});

test('R-FILTER-12 | Given rapid filter changes and nested click targets, when the final category is selected, then one correct selection remains on each page', async ({ page }) => {
  await openCatalog(page, 'projects');
  await page.evaluate(() => {
    const click = selector => document.querySelector(selector).click();
    for (let i = 0; i < 10; i++) {
      click('#proj-filters [data-group="proj_test"]');
      click('#proj-filters [data-group="proj_software"]');
      click('#blog-filters [data-group="category_system_engineering"]');
      window.setBlogLang('tr');
    }
  });
  await expectSelection(page, 'projects', 'software');
  await expect(names(page, 'proj-grid')).toHaveText(['software-rest']);
  await expectSelection(page, 'blog', 'systems');
  // Exercise pointer/touch activation as well as the keyboard path above.
  await page.locator('#proj-filters [data-group="proj_all"]').click();
  await expectSelection(page, 'projects', 'all');
  await navigateToSection(page, 'blog');
  await expect(titles(page)).toHaveText(['Systems TR']);
  await page.locator('#blog-filters [data-group="category_all"] span').click();
  await expect(titles(page)).toHaveText(['Testing TR', 'Software TR', 'Systems TR']);
  await expectSelection(page, 'projects', 'all');
});

test('R-FILTER-13 | Given no owned repos but valid starred repos, when categories change, then starred pagination remains available', async ({ page }) => {
  await openCatalog(page, 'projects', { 'github-repos.json': [], 'github-starred.json': starred(21) });
  for (const category of Object.keys(projectGroups)) {
    await selectCategory(page, 'projects', category);
    await expect(page.locator('#proj-empty')).toBeVisible();
    await expect(names(page, 'proj-starred-grid')).toHaveCount(20);
    await expect(page.locator('#proj-starred-wrap')).toBeVisible();
  }
  await page.locator('#proj-starred-more-btn').click();
  await expect(names(page, 'proj-starred-grid')).toHaveCount(21);
  await expect(page.locator('#proj-starred-more-wrap')).toBeHidden();
  await navigateToSection(page, 'blog');
  await expect(titles(page)).toHaveCount(6);
  await expectSelection(page, 'projects', 'software');
});

test('R-FILTER-14 | Given long category labels, when each project filter is selected, then section labels remain entirely within their container', async ({ page }, testInfo) => {
  await openCatalog(page, 'projects', { 'github-starred.json': starred(1) });
  for (const category of ['all', 'test', 'software', 'systems']) {
    await selectCategory(page, 'projects', category);
    const labels = page.locator('.proj-section-divider-label:visible, .proj-starred-divider-label:visible');
    for (const label of await labels.all()) {
      const bounds = await label.evaluate(element => {
        const child = element.getBoundingClientRect();
        const parent = element.parentElement.getBoundingClientRect();
        return { left: child.left, right: child.right, parentLeft: parent.left, parentRight: parent.right };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(bounds.parentLeft - 1);
      expect(bounds.right).toBeLessThanOrEqual(bounds.parentRight + 1);
    }
  }
  await testInfo.attach('project-filter-labels', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
});

for (const failure of ['network-error', 'malformed-json', { unexpected: true }, []]) {
  test(`R-FILTER-07 | Given unavailable catalog (${JSON.stringify(failure)}), when filters change, then each page can recover independently`, async ({ page }) => {
    await openCatalog(page, 'projects', {
      'github-repos.json': failure, 'github-starred.json': failure,
      'medium-test.json': failure
    });
    await selectCategory(page, 'projects', 'test');
    await expect(page.locator('#proj-empty')).toBeVisible();
    await expect(page.locator('#proj-loading')).toBeHidden();
    await expect(page.locator('#proj-starred-wrap')).toBeHidden();
    await navigateToSection(page, 'blog');
    await selectCategory(page, 'blog', 'test');
    await expect(page.locator('#blog-empty')).toBeVisible();
    await selectCategory(page, 'blog', 'systems');
    await expect(titles(page)).toHaveText(['Systems EN', 'Systems TR']);
    await expectSelection(page, 'projects', 'test');
  });
}

for (const section of ['blog', 'projects']) {
  test(`R-FILTER-08 | Given delayed ${section} data, when a selection changes before completion, then loading stays truthful and the final selection wins`, async ({ page }) => {
    await mockCatalog(page);
    let release;
    const ready = new Promise(resolve => { release = resolve; });
    const pattern = section === 'blog' ? '**/data/medium-*.json' : '**/data/github-repos.json';
    await page.route(pattern, async route => { await ready; await route.fallback(); });
    try {
      await page.goto(`/#${section}`);
      await expectSection(page, section);
      await expect(page.locator('.preloader')).toHaveCount(0);
      await selectCategory(page, section, 'systems');
      if (section === 'blog') await selectLanguage(page, 'en');
      const prefix = section === 'blog' ? 'blog' : 'proj';
      await expect(page.locator(`#${prefix}-loading`)).toBeVisible();
      await expect(page.locator(`#${prefix}-empty`)).toBeHidden();
      release();
      await expect(page.locator(`#${prefix}-loading`)).toBeHidden();
      if (section === 'blog') await expect(titles(page)).toHaveText(['Systems EN']);
      else await expect(names(page, 'proj-grid')).toHaveText(['systems-rest']);
      await expectSelection(page, section, 'systems');
    } finally { release(); }
  });
}

for (const count of [0, 1, 19, 20, 21, 39, 40, 41]) {
  test(`R-FILTER-09 | Given ${count} starred repos, when paginating and switching categories, then every item appears once at the 20-item boundary`, async ({ page }) => {
    await openCatalog(page, 'projects', { 'github-starred.json': starred(count) });
    let shown = Math.min(count, 20);
    await expect(names(page, 'proj-starred-grid')).toHaveCount(shown);
    if (!count) await expect(page.locator('#proj-starred-wrap')).toBeHidden();
    while (shown < count) {
      await expect(page.locator('#proj-starred-remaining')).toHaveText(`(${count - shown} more)`);
      await selectCategory(page, 'projects', 'test');
      await expect(names(page, 'proj-starred-grid')).toHaveCount(shown);
      await page.locator('#proj-starred-more-btn').click();
      shown = Math.min(count, shown + 20);
      await expect(names(page, 'proj-starred-grid')).toHaveCount(shown);
    }
    await expect(page.locator('#proj-starred-more-wrap')).toBeHidden();
    await expect(names(page, 'proj-starred-grid')).toHaveText(Array.from({ length: count }, (_, i) => `star-${i + 1}`));
    await navigateToSection(page, 'blog');
    await selectCategory(page, 'blog', 'software');
    await navigateToSection(page, 'projects');
    await expect(names(page, 'proj-starred-grid')).toHaveCount(count);
    await page.evaluate(() => window.showMoreStarred());
    await expect(names(page, 'proj-starred-grid')).toHaveCount(count);
  });
}
