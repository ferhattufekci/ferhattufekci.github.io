// scripts/fetch-github.js
//
// GitHub REST API'den public repoları çeker.
// Pinned repolar için GitHub GraphQL API kullanılır.
// Kategori: repo topics'e göre otomatik tespit edilir.
// Dil: repo.language alanından alınır.
//
// Çalıştırmak için: node scripts/fetch-github.js
// GitHub Actions ile otomatik çalışır.

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname }           from 'path';
import { fileURLToPath }           from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const DATA_DIR  = join(ROOT, 'data');
const USERNAME  = 'ferhattufekci';
const TOKEN     = process.env.GITHUB_TOKEN || '';

const HEADERS = {
  'User-Agent': 'portfolio-fetcher/1.0',
  'Accept':     'application/vnd.github+json',
  ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {})
};

// ─── Exclude list ─────────────────────────────────────────────────────────────
const EXCLUDE = new Set([
  'ferhattufekci',           // profile readme repo
]);

// ─── Kategori tespiti ─────────────────────────────────────────────────────────
const CAT_RULES = [
  { cat: 'test',     kws: ['test','testing','qa','automation','selenium','cypress','playwright','junit','bdd','tdd','istqb',
                           'postman','api-test','rest-test','mock','stub','karate','restassured','appium','jmeter',
                           'performance-test','load-test','regression','manual-test','test-case','guide','complete-guide'] },
  { cat: 'software', kws: ['spring','java','javascript','typescript','react','backend','frontend','api','microservice',
                           'fullstack','full-stack','node','python','docker','kubernetes','sql','devops',
                           'webapp','web-app','oop','oofp','object-oriented','functional','kotlin','swift',
                           'angular','vue','nextjs','nestjs','express','flask','django','rest','graphql',
                           'crud','mvc','clean-architecture','design-pattern','data-structure','algorithm',
                           'machine-learning','data-science','jupyter','pandas','numpy','matplotlib'] },
  { cat: 'systems',  kws: ['requirements','business-analysis','ba','systems-engineering','incose','babok',
                           'use-case','uml','bpmn','sla','slo','sli','digital-twin','defense','savunma',
                           'gereksinim','stakeholder','product-owner','user-story','modelling','traceability'] }
];

function detectCat(name, description, topics) {
  // repo adındaki - ve _ ayırıcılarını boşluğa çevir (örn: spring-6-webapp → spring 6 webapp)
  const nameWords = name.replace(/[-_]/g, ' ');
  const hay = [nameWords, name, description || '', ...topics].join(' ').toLowerCase();
  const scores = { test: 0, software: 0, systems: 0 };
  for (const r of CAT_RULES)
    for (const kw of r.kws)
      if (hay.includes(kw)) scores[r.cat]++;
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'software'; // default
}

function detectLang(repoLang) {
  // Repo dilini TR/EN olarak yorumlamak anlamsız;
  // bunun yerine "primary language" olarak kullanıyoruz.
  // TR/EN kararı: description'da Türkçe karakter var mı?
  return null; // caller'da description'a bakılır
}

function isTR(text) {
  return /[ğüşıöçĞÜŞİÖÇ]/.test(text || '');
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────
async function fetchJSON(url) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

async function fetchGraphQL(query) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch('https://api.github.com/graphql', {
    method:  'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query })
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  return res.json();
}

// ─── Pinned repos (GraphQL) ───────────────────────────────────────────────────
async function fetchPinnedNames() {
  if (!TOKEN) {
    console.log('⚠️  GITHUB_TOKEN yok — pinned repolar tespit edilemez, hepsi normal gösterilir.');
    return new Set();
  }
  try {
    const data = await fetchGraphQL(`{
      user(login: "${USERNAME}") {
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes { ... on Repository { name } }
        }
      }
    }`);
    const names = (data?.data?.user?.pinnedItems?.nodes || []).map(n => n.name);
    console.log(`📌 Pinned: ${names.join(', ') || '(yok)'}`);
    return new Set(names);
  } catch (e) {
    console.log('⚠️  Pinned fetch hatası:', e.message);
    return new Set();
  }
}

// ─── All public repos (REST, paginated) ───────────────────────────────────────
async function fetchAllRepos() {
  const repos = [];
  let page = 1;
  while (true) {
    const batch = await fetchJSON(
      `https://api.github.com/users/${USERNAME}/repos?type=public&per_page=100&page=${page}`
    );
    if (!batch.length) break;
    repos.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return repos;
}

// ─── Language color map ───────────────────────────────────────────────────────
const LANG_COLORS = {
  Java:       '#b07219',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python:     '#3572A5',
  HTML:       '#e34c26',
  CSS:        '#563d7c',
  Shell:      '#89e051',
  Go:         '#00ADD8',
  Kotlin:     '#A97BFF',
  Swift:      '#F05138',
  'C#':       '#178600',
  'C++':      '#f34b7d',
  Ruby:       '#701516',
  PHP:        '#4F5D95',
  Rust:       '#dea584',
  Dart:       '#00B4AB',
};

// Fetch all languages for a repo (bytes per language)
async function fetchLanguages(repoName) {
  try {
    const data = await fetchJSON(
      `https://api.github.com/repos/${USERNAME}/${repoName}/languages`
    );
    if (!data || typeof data !== 'object') return [];
    const total = Object.values(data).reduce((s, v) => s + v, 0);
    if (total === 0) return [];
    return Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, bytes]) => ({
        name:    lang,
        color:   LANG_COLORS[lang] || '#8b949e',
        percent: Math.round((bytes / total) * 100),
      }));
  } catch (e) {
    return [];
  }
}

// ─── Fetch starred repos (paginated) ─────────────────────────────────────────
async function fetchStarred() {
  const repos = [];
  let page = 1;
  while (true) {
    const batch = await fetchJSON(
      `https://api.github.com/users/${USERNAME}/starred?per_page=100&page=${page}`
    );
    if (!batch.length) break;
    repos.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return repos.map(r => ({
    name:        r.name,
    owner:       r.owner.login,
    description: r.description || '',
    url:         r.html_url,
    homepage:    r.homepage || null,
    language:    r.language || null,
    langColor:   LANG_COLORS[r.language] || '#8b949e',
    stars:       r.stargazers_count ?? 0,
    topics:      r.topics || [],
  }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  mkdirSync(DATA_DIR, { recursive: true });

  console.log(`\n📡 GitHub repoları çekiliyor: @${USERNAME}`);
  const [allRepos, pinnedNames] = await Promise.all([fetchAllRepos(), fetchPinnedNames()]);

  const out = [];

  for (const r of allRepos) {
    if (EXCLUDE.has(r.name))   continue;
    if (r.archived)            continue; // arşivlenmiş repoları hariç tut

    const topics  = r.topics || [];
    const cat     = detectCat(r.name, r.description, topics);
    const lang    = isTR(r.description) ? 'tr' : 'en';
    const pinned  = pinnedNames.has(r.name);
    const languages = await fetchLanguages(r.name);

    const item = {
      name:        r.name,
      description: r.description || '',
      url:         r.html_url,
      homepage:    r.homepage || null,
      language:    r.language || null,
      langColor:   LANG_COLORS[r.language] || '#8b949e',
      languages,
      stars:       r.stargazers_count ?? 0,
      forks:       r.forks_count,
      topics,
      pinned,
      category:    cat,
      lang,
      updatedAt:   r.pushed_at,
    };

    console.log(`  ${pinned ? '📌' : '  '} [${cat}][${lang}] ${r.name} (${r.language || '?'}, ⭐${item.stars})`);
    out.push(item);
  }

  // Sırala: pinned önce, sonra star sayısına göre
  out.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.stars - a.stars;
  });

  writeFileSync(join(DATA_DIR, 'github-repos.json'), JSON.stringify(out, null, 2), 'utf-8');

  const meta = {
    lastUpdated: new Date().toISOString(),
    counts: {
      total:   out.length,
      pinned:  out.filter(r => r.pinned).length,
      systems: out.filter(r => r.category === 'systems').length,
      test:    out.filter(r => r.category === 'test').length,
      software:out.filter(r => r.category === 'software').length,
    }
  };
  writeFileSync(join(DATA_DIR, 'github-meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
  console.log('\n✅ Tamamlandı:', meta.counts);

  // Starred repos
  console.log('\n⭐ Starred repolar çekiliyor...');
  try {
    const starred = await fetchStarred();
    starred.sort((a, b) => b.stars - a.stars);
    writeFileSync(join(DATA_DIR, 'github-starred.json'), JSON.stringify(starred, null, 2), 'utf-8');
    console.log(`💾 github-starred.json: ${starred.length} repo`);
  } catch (e) {
    console.log('⚠️  Starred fetch hatası:', e.message);
  }
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
