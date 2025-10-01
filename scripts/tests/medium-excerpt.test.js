import test from 'node:test';
import assert from 'node:assert/strict';
import ArticleExcerpt from '../../js/medium-excerpt.js';
import { parseRSS, selectPageExcerpt, completeExcerpts } from '../fetch-medium.js';

const { selectExcerpt, decodeEntities } = ArticleExcerpt;
const introduction = 'Clear requirements help every stakeholder understand the same intended behavior.';
const paragraph = `<p>${introduction}</p>`;

test('keeps a complete short description instead of replacing it with body copy', () => {
  assert.equal(selectExcerpt({ description: 'A practical guide.', content: paragraph }), 'A practical guide.');
});

test('keeps a complete subtitle without requiring terminal punctuation', () => {
  assert.equal(selectExcerpt({ description: 'A practical guide to reliable systems', content: paragraph }), 'A practical guide to reliable systems');
});

test('preserves a complete long description without a character limit', () => {
  const description = 'Every stakeholder needs clear requirements. '.repeat(12).trim();
  assert.ok(description.length > 220);
  assert.equal(selectExcerpt({ description, content: paragraph }), description);
});

for (const ending of ['…', '...', '&hellip;', '&#x2026;', '&#8230;']) {
  test(`replaces a truncated description ending in ${ending}, including trailing whitespace`, () => {
    assert.equal(selectExcerpt({ description: `Clear requirements help every stakeholder${ending} \n`, content: paragraph }), introduction);
  });
}

test('uses one complete paragraph when description is missing', () => {
  assert.equal(selectExcerpt({ description: '', content: paragraph }), introduction);
});

test('skips images, captions, membership messages, short and unfinished paragraphs', () => {
  const content = '<p><img src="cover.png"></p>' +
    '<figure><figcaption><p>This photograph illustrates the whole article.</p></figcaption></figure>' +
    '<p class="image-caption">A complete caption with several descriptive words.</p>' +
    '<p>Medium üyesi değilseniz yazımı ücretsiz olarak okumaya devam etmek için buraya tıklayın.</p>' +
    '<p>If you’re not a Medium member, read this story for free.</p>' +
    '<p>Continue reading on Medium »</p><p>Hello world.</p>' +
    '<p>Clear requirements help every stakeholder and…</p>' + paragraph;
  assert.equal(selectExcerpt({ description: '', content }), introduction);
});

test('replaces a membership description with meaningful introductory copy', () => {
  assert.equal(selectExcerpt({ description: 'Medium üyesi değilseniz buraya tıklayın.', content: paragraph }), introduction);
});

test('preserves Turkish characters and numeric/named HTML entities', () => {
  const description = '<p>&Ccedil;&ouml;z&uuml;m, gereksinim m&#xFC;hendisli&#287;inde &amp; i&#351; analizinde &#304;stanbul i&#231;in &ldquo;netlik&rdquo; sa&#287;lar.</p>';
  assert.equal(selectExcerpt({ description }), 'Çözüm, gereksinim mühendisliğinde & iş analizinde İstanbul için “netlik” sağlar.');
});

test('keeps invalid numeric entities harmless', () => {
  assert.equal(decodeEntities('&#x110000; &#55296;'), '&#x110000; &#55296;');
});

test('returns one introductory paragraph, never the entire content:encoded article', () => {
  const later = 'This later paragraph describes implementation details and should stay in the article.';
  assert.equal(selectExcerpt({ content: paragraph + `<p>${later}</p>` }), introduction);
});

test('also avoids combining an article supplied as HTML description into one excerpt', () => {
  const description = paragraph + '<p>The rest of the article stays out of the card.</p>';
  assert.equal(selectExcerpt({ description }), introduction);
});

test('does not disguise a truncated preview by removing its ellipsis', () => {
  assert.equal(selectExcerpt({ description: 'Gereksinim mühendisliğinin özü; test ve…' }), '');
});

test('preserves an intentional ellipsis corroborated by the original paragraph', () => {
  const description = 'We will find out what happens tomorrow...';
  assert.equal(selectExcerpt({ description, content: `<p>${description}</p>` }), description);
});

test('does not mistake an internal ellipsis for a truncated ending', () => {
  const description = 'Measure… then improve the reliability of the system.';
  assert.equal(selectExcerpt({ description, content: paragraph }), description);
});

test('rejects an obviously unfinished conjunction or unclosed parenthesis', () => {
  for (const description of ['Clear requirements help because', 'Gereksinimler çünkü', 'Stakeholders (design, development']) {
    assert.equal(selectExcerpt({ description, content: paragraph }), introduction);
  }
});

test('removes Medium continuation footer without cutting the description', () => {
  const description = `<p>${introduction}</p><p><a>Continue reading on Analyst’s corner »</a></p>`;
  assert.equal(selectExcerpt({ description }), introduction);
});

test('uses public SEO description when RSS has no content:encoded', () => {
  const page = `<meta property="og:description" content="Clear requirements…">` +
    `<meta content="${introduction}" name="description">` +
    '<article><p class="pw-post-body-paragraph">A different complete paragraph appears in the article.</p></article>';
  assert.equal(selectPageExcerpt(page), introduction);
});

test('uses a complete public body paragraph when SEO description is also truncated', () => {
  const page = '<meta name="description" content="Clear requirements&hellip;">' +
    '<p>A complete but unrelated paragraph outside the article.</p>' +
    '<article><p class="pw-post-body-paragraph">Member-only story</p>' +
    `<p class="pw-post-body-paragraph">${introduction}</p><p>Related stories are outside the body.</p></article>`;
  assert.equal(selectPageExcerpt(page), introduction);
});

test('RSS parser never treats a truncated description as its own fallback content', () => {
  const xml = '<rss><channel><item><title>Requirements engineering guide</title>' +
    '<link>https://medium.com/example/guide-0123456789ab</link>' +
    '<description><![CDATA[<p>Clear requirements help every stakeholder…</p>]]></description>' +
    '</item></channel></rss>';
  assert.equal(parseRSS(xml)[0].excerpt, '');
});

test('loads public metadata only for unusable previews and keeps article data intact', async () => {
  const articles = [
    { title: 'Complete', url: 'https://medium.com/example/complete', excerpt: 'A practical guide.' },
    { title: 'Missing', url: 'https://medium.com/example/missing?source=rss', excerpt: '', lang: 'tr', category: 'systems' },
  ];
  const calls = [];
  await completeExcerpts(articles, [], async (url, accept) => {
    calls.push({ url, accept });
    return `<meta name="description" content="${introduction}">`;
  });
  assert.deepEqual(calls, [{ url: 'https://medium.com/example/missing', accept: 'text/html' }]);
  assert.equal(articles[0].excerpt, 'A practical guide.');
  assert.deepEqual(articles[1], { title: 'Missing', url: 'https://medium.com/example/missing?source=rss', excerpt: introduction, lang: 'tr', category: 'systems' });
});

test('uses only a complete previous preview during a temporary public-page failure', async () => {
  const loadText = async () => { throw new Error('HTTP 503'); };
  const articles = [{ title: 'Cached', url: 'https://medium.com/example/cached', excerpt: '' }];
  await completeExcerpts(articles, [{ ...articles[0], excerpt: introduction }], loadText);
  assert.equal(articles[0].excerpt, introduction);
  articles[0].excerpt = '';
  await completeExcerpts(articles, [{ ...articles[0], excerpt: 'Clear requirements…' }], loadText);
  assert.equal(articles[0].excerpt, '');
});
