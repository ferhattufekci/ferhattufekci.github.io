// scripts/fetch-medium.js  (v8 — fully automatic)
//
// Whitelist yok. Her makale otomatik olarak:
//   - Kategori: RSS <category> tag'lerine göre tespit edilir
//   - Dil:      Türkçe karakter kontrolüyle tespit edilir
//   - Hariç tutulanlar: data/article-exclude.json'daki hex ID'ler
//
// Yeni makale yayınlanınca → Actions otomatik çeker → sitede görünür.
// Hiçbir manuel adım gerekmez.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const DATA_DIR   = join(ROOT, 'data');
const MEDIUM_RSS = 'https://medium.com/feed/@ferhattufekci';

// ─── Exclude list ─────────────────────────────────────────────────────────────
// Gösterilmemesi gereken makalelerin hex ID'leri (About Me, kişisel yazılar vb.)
const EXCLUDE = new Set([
  '1ee2f58f131d',  // About Me — Ferhat Tufekci
  '258c7eff1349',  // BEDELLİ ASKERLİK
]);

// ─── Tag → Kategori Eşlemesi ──────────────────────────────────────────────────
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

// ─── Otomatik kategori tespiti ────────────────────────────────────────────────
function detectCategory(title, tags) {
  const haystack = (title + ' ' + tags.join(' ')).toLowerCase();

  // Skor tabanlı: her kategori için eşleşen tag sayısını say
  const scores = { test: 0, software: 0, systems: 0 };
  for (const rule of TAG_RULES) {
    for (const kw of rule.tags) {
      if (haystack.includes(kw)) scores[rule.cat]++;
    }
  }

  // En yüksek skoru al
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'systems'; // default: systems
}

// ─── Otomatik dil tespiti ─────────────────────────────────────────────────────
function detectLang(title) {
  return /[ğüşıöçĞÜŞİÖÇ]/.test(title) ? 'tr' : 'en';
}

// ─── URL'den hex ID çıkar ─────────────────────────────────────────────────────
function hexIdFromUrl(url) {
  const slug  = (url || '').replace(/\?.*$/, '').split('/').filter(Boolean).pop() || '';
  const parts = slug.split('-');
  const last  = parts[parts.length - 1] || '';
  return /^[a-f0-9]{8,16}$/i.test(last) ? last : null;
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────
async function fetchText(url) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSSBot/1.0)', 'Accept': 'application/rss+xml, text/xml, */*' },
    redirect: 'follow', timeout: 20000
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

// ─── XML helpers ─────────────────────────────────────────────────────────────
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

// ─── RSS parse ────────────────────────────────────────────────────────────────
function parseRSS(xml) {
  const articles = [];
  let   excluded = 0;

  for (const item of extractAll(xml, 'item')) {
    const title   = cdata(extractOne(item, 'title'));
    const url     = cdata(extractOne(item, 'link') || extractAttr(item, 'link', 'href'));
    const pubDate = cdata(extractOne(item, 'pubDate'));
    const content = cdata(extractOne(item, 'content:encoded') || extractOne(item, 'description'));
    const tags    = extractAll(item, 'category').map(cdata).map(t => t.toLowerCase());

    if (!title || !url) continue;

    // Exclude kontrolü
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
    const excerpt   = stripHtml(content).slice(0, 250).trim();
    const date      = pubDate ? new Date(pubDate).toISOString() : null;

    // Otomatik kategori & dil tespiti
    const category = detectCategory(title, tags);
    const lang     = detectLang(title);

    console.log(`  ✅ [${category}][${lang}] ${title.slice(0, 55)}`);
    if (tags.length) console.log(`     tags: ${tags.slice(0, 5).join(', ')}`);

    articles.push({ title, url, thumbnail, excerpt, date, category, lang });
  }

  console.log(`\n📊 Dahil: ${articles.length} | Hariç: ${excluded}`);
  return articles;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  mkdirSync(DATA_DIR, { recursive: true });

  console.log('\n📡 RSS çekiliyor: ' + MEDIUM_RSS);
  let all = [];
  try {
    all = parseRSS(await fetchText(MEDIUM_RSS));
  } catch (err) {
    console.log('❌ RSS hatası:', err.message);
  }

  // Kategorilere ayır
  const buckets = { systems: [], test: [], software: [] };
  for (const { category, lang, ...rest } of all) {
    if (buckets[category]) buckets[category].push({ ...rest, lang });
  }

  // Kaydet
  for (const [cat, fn] of Object.entries({ systems: 'medium-systems.json', test: 'medium-test.json', software: 'medium-software.json' })) {
    buckets[cat].sort((a, b) => new Date(b.date||0) - new Date(a.date||0));
    writeFileSync(join(DATA_DIR, fn), JSON.stringify(buckets[cat], null, 2), 'utf-8');
    console.log(`💾 ${fn}: ${buckets[cat].length} yazı`);
  }

  // medium-all.json (browser fallback)
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

run().catch(err => console.error('Fatal:', err));
