import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import ArticleLanguage from '../js/medium-language.js';
import ArticleExcerpt from '../js/medium-excerpt.js';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const DATA_DIR   = join(ROOT, 'data');
const MEDIUM_RSS = 'https://medium.com/feed/@ferhattufekci';

const EXCLUDE = new Set([
  '1ee2f58f131d',  // About Me — Ferhat Tufekci
  '258c7eff1349',  // BEDELLİ ASKERLİK
  '2f9bed8fbb80',  // Nike Trail
  
]);

const TAG_RULES = [
  {
    cat: 'test',
    tags: ['test','testing','qa','quality assurance','kalite','otomasyon',
           'automation','istqb','selenium','cypress','playwright','junit',
           'testng','manuel test','manual testing','regresyon','regression',
           'bug','defect','test muhendisligi','test mühendisliği']
  },
  {
    cat: 'software',
    tags: ['software development','yazılım','geliştirme','fullstack','full-stack',
           'full stack','backend','frontend','react','spring','spring boot',
           'java','javascript','typescript','microservice','api design','rest api',
           'devops','docker','kubernetes','cloud','database','sql','yazilim']
  },
  {
    cat: 'systems',
    tags: ['systems engineering','sistem mühendisliği','business analysis',
           'iş analizi','requirements','gereksinim','incose','babok','analiz',
           'modelling','modeling','use case','user story','product owner',
           'stakeholder','bpmn','uml','sla','slo','sli','reliability',
           'digital twin','savunma','defense','sistem','system']
  }
];

function detectCategory(title, tags) {
  const haystack = (title + ' ' + tags.join(' ')).toLowerCase();

  const scores = { test: 0, software: 0, systems: 0 };
  for (const rule of TAG_RULES) {
    for (const kw of rule.tags) {
      if (haystack.includes(kw)) scores[rule.cat]++;
    }
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'systems';  
}

function hexIdFromUrl(url) {
  const slug  = (url || '').replace(/\?.*$/, '').split('/').filter(Boolean).pop() || '';
  const parts = slug.split('-');
  const last  = parts[parts.length - 1] || '';
  return /^[a-f0-9]{8,16}$/i.test(last) ? last : null;
}

async function fetchText(url, accept = 'application/rss+xml, text/xml, */*') {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(url, {
    headers: {
      'User-Agent': accept === 'text/html'
        ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
        : 'Mozilla/5.0 (compatible; RSSBot/1.0)',
      'Accept': accept,
    },
    redirect: 'follow', signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

function extractAll(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out = []; let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}
const extractOne  = (xml, tag) => extractAll(xml, tag)[0] || '';
const extractAttr = (xml, tag, at) => { const m = xml.match(new RegExp(`<${tag}[^>]*\\s${at}="([^"]*)"`, 'i')); return m ? m[1] : ''; };
const cdata       = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
const stripHtml   = h => h.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const firstImage  = html => { const m = html.match(/<img[^>]+src="([^"]+)"/i); return m ? m[1] : null; };

const { decodeEntities, selectExcerpt } = ArticleExcerpt;

export function parseRSS(xml) {
  const articles = [];
  let   excluded = 0;

  for (const item of extractAll(xml, 'item')) {
    // Medium can wrap CDATA headlines across lines; normalize whitespace before displaying the title.
    const title   = decodeEntities(cdata(extractOne(item, 'title'))).replace(/\s+/g, ' ').trim();
    const url     = cdata(extractOne(item, 'link') || extractAttr(item, 'link', 'href'));
    const pubDate = cdata(extractOne(item, 'pubDate'));
    const description = cdata(extractOne(item, 'description'));
    const encoded = cdata(extractOne(item, 'content:encoded'));
    const content = encoded || description;
    const tags    = extractAll(item, 'category').map(cdata).map(t => t.toLowerCase());

    if (!title || !url) continue;

    const hexId = hexIdFromUrl(url);
    if (hexId && EXCLUDE.has(hexId)) {
      console.log(`  ⛔ [excluded] ${title.slice(0, 50)}`);
      excluded++;
      continue;
    }

    const mediaThumbnail =
      extractAttr(item, 'media:thumbnail', 'url') ||
      extractAttr(item, 'media:content',   'url');
    const thumbnail = mediaThumbnail || firstImage(content) || null;
    const excerpt = selectExcerpt({ description, content: encoded });
    const date      = pubDate ? new Date(pubDate).toISOString() : null;

    const category = detectCategory(title, tags);
    const lang     = ArticleLanguage.resolve({
      title,
      language: cdata(extractOne(item, 'language') || extractOne(item, 'dc:language')),
      content: decodeEntities(stripHtml(content)),
    });

    console.log(`  ✅ [${category}][${lang}] ${title.slice(0, 55)}`);
    if (tags.length) console.log(`     tags: ${tags.slice(0, 5).join(', ')}`);

    articles.push({ title, url, thumbnail, excerpt, date, category, lang });
  }

  console.log(`\n📊 Dahil: ${articles.length} | Hariç: ${excluded}`);
  return articles;
}

export function selectPageExcerpt(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  const attributes = tag => Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map(m => [m[1].toLowerCase(), m[3]])
  );
  const description = metaTags.map(attributes).find(meta => meta.name?.toLowerCase() === 'description')?.content || '';
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || '';
  const content = (article.match(/<p\b[^>]*class=["'][^"']*\bpw-post-body-paragraph\b[^"']*["'][^>]*>[\s\S]*?<\/p>/gi) || []).join('');
  return selectExcerpt({ description, content });
}

export async function completeExcerpts(articles, previous = [], loadText = fetchText) {
  for (const article of articles) {
    if (article.excerpt) continue;
    try {
      const pageUrl = new URL(article.url);
      if (pageUrl.protocol !== 'https:' || !['medium.com', 'www.medium.com'].includes(pageUrl.hostname)) continue;
      pageUrl.search = '';
      article.excerpt = selectPageExcerpt(await loadText(pageUrl.href, 'text/html'));
    } catch (err) {
      console.warn(`⚠️ Public preview unavailable for ${article.title}: ${err.message}`);
    }
    if (!article.excerpt) {
      const cached = previous.find(item => item.url === article.url);
      article.excerpt = selectExcerpt({ description: cached?.excerpt || '' });
    }
  }
  return articles;
}

async function run() {
  mkdirSync(DATA_DIR, { recursive: true });

  console.log('\n📡 RSS çekiliyor: ' + MEDIUM_RSS);
  const all = parseRSS(await fetchText(MEDIUM_RSS));
  if (!all.length) throw new Error('RSS contains no usable articles; existing data left unchanged.');
  let previous = [];
  try {
    previous = JSON.parse(readFileSync(join(DATA_DIR, 'medium-all.json'), 'utf8'));
  } catch { /* The first sync has no previously generated previews. */ }
  await completeExcerpts(all, previous);

  const buckets = { systems: [], test: [], software: [] };
  for (const { category, lang, ...rest } of all) {
    if (buckets[category]) buckets[category].push({ ...rest, lang });
  }

  for (const [cat, fn] of Object.entries({ systems: 'medium-systems.json', test: 'medium-test.json', software: 'medium-software.json' })) {
    buckets[cat].sort((a, b) => new Date(b.date||0) - new Date(a.date||0));
    writeFileSync(join(DATA_DIR, fn), JSON.stringify(buckets[cat], null, 2), 'utf-8');
    console.log(`💾 ${fn}: ${buckets[cat].length} yazı`);
  }

  const allForBrowser = all.map(({ ...a }) => a);
  allForBrowser.sort((a, b) => new Date(b.date||0) - new Date(a.date||0));
  writeFileSync(join(DATA_DIR, 'medium-all.json'), JSON.stringify(allForBrowser, null, 2), 'utf-8');

  const meta = {
    lastUpdated: new Date().toISOString(),
    counts: { systems: buckets.systems.length, test: buckets.test.length, software: buckets.software.length, total: all.length }
  };
  writeFileSync(join(DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
  console.log('\n✅ Tamamlandı:', meta.counts);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(err => {
    console.error('Fatal:', err);
    process.exitCode = 1;
  });
}
