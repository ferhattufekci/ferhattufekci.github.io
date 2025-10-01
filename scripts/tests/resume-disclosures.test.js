import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { ROOT } from '../lib/public-files.mjs';
import { toMarkdown } from '../lib/agent-documents.mjs';

// Production facts captured before the UX change; intentionally independent of rendering.
const before = JSON.parse(await readFile(join(ROOT, 'tests/fixtures/resume-content.json'), 'utf8'));
const { document } = parseHTML(await readFile(join(ROOT, 'index.html'), 'utf8'));
const resume = document.querySelector('#resume');
const text = node => node.textContent.replace(/\s+/g, ' ').trim();
const section = name => [...resume.querySelectorAll('.resume-section')].find(node => text(node.querySelector('.resume-section-title')) === name);
const items = name => [...section(name).querySelectorAll('.timeline-item')];

test('R-RESUME-11: academic background appears once immediately before the preserved Since 2011 paragraph in HTML and Markdown', async () => {
  const paragraphs = [...resume.querySelectorAll('.resume-summary-text p')];
  const academic = paragraphs.filter(node => text(node) === before.summary[2]);
  assert.equal(academic.length, 1);
  assert.equal(paragraphs.indexOf(academic[0]), 2);
  assert.equal(text(academic[0].nextElementSibling), before.summary[3]);
  assert.match(text(academic[0].nextElementSibling), /^Since 2011, I’ve built versatile experience/);
  const markdown = await readFile(join(ROOT, 'index.md'), 'utf8');
  assert.equal(markdown.split(before.summary[2]).length - 1, 1);
  assert.ok(markdown.includes(before.summary[2] + '\n\n' + before.summary[3]));
});

test('R-RESUME-01: summary, nine chunks, source facts, links and PDF remain intact', async () => {
  assert.deepEqual([...resume.querySelectorAll('h3')].map(text), ['Summary', 'Top Skills', 'Languages', 'Personality Assessment', 'Education', 'Experience', 'Engineering Contributions', 'Certifications']);
  assert.deepEqual([...resume.querySelectorAll('.resume-summary-text p')].map(text), before.summary);
  const summary = resume.querySelector('.resume-summary-text');
  assert.equal(summary.querySelectorAll(':scope > p').length, 2);
  assert.equal(summary.querySelectorAll('details').length, 1);
  assert.equal(resume.querySelectorAll('.resume-disclosure-count').length, 12);
  for (const header of resume.querySelectorAll('.resume-disclosure-header, .resume-item-tech-label')) {
    assert.doesNotMatch(text(header), /\b\d+\s+(?:topics?|tools?)\b/i);
  }
  assert.deepEqual([...resume.querySelectorAll('#resume-meta .resume-skill-tags')].map(node => [...node.children].map(text)), before.badges);
  assert.equal(text(resume.querySelector('.resume-personality-card')), before.personality);
  assert.deepEqual([...resume.querySelectorAll('a')].map(a => ['href', 'target', 'rel'].map(key => a.getAttribute(key))), before.links);
  assert.equal(resume.querySelector('.resume-bottom-cta').closest('details'), null);
  const pdf = await readFile(join(ROOT, 'FerhatTufekci_CV.pdf'));
  // Updated CV independently verified against remote main before history consolidation.
  assert.equal(createHash('sha256').update(pdf).digest('hex'), '6483c5c081131c058e60adf2f0c70cfe5429d7c0e9d1aa2b0fcc6346cedfd12a');
  for (const [name, expected] of [['Education', before.education], ['Experience', before.experience], ['Engineering Contributions', before.contributions]]) {
    assert.equal(items(name).length, expected.length);
    items(name).forEach((item, index) => {
      const record = expected[index];
      assert.equal(text(item.querySelector('.item-period')), record.period);
      assert.equal(text(item.querySelector('.item-company')), record.company);
      assert.equal(text(item.querySelector('.item-title')), record.title);
      assert.deepEqual([...item.querySelectorAll('.right-part > p')].map(text), record.paragraphs);
      assert.deepEqual([...item.querySelectorAll('.resume-item-points li')].map(text), record.bullets);
    });
  }
});

test('R-RESUME-02: three independent coursework disclosures each have one flat ordered list and no categories', () => {
  const education = items('Education');
  assert.equal(education[1].querySelector('details'), null);
  const panels = [...section('Education').querySelectorAll('details')];
  assert.equal(panels.length, 3);
  panels.forEach((panel, index) => {
    assert.equal(panel.hasAttribute('open'), false);
    assert.equal(panel.hasAttribute('name'), false);
    assert.equal(panel.querySelectorAll('ul').length, 1);
    assert.equal(panel.querySelectorAll('h1,h2,h3,h4,h5,h6,details,ul ul,ol,hr').length, 0);
    assert.deepEqual([...panel.querySelectorAll('ul > li')].map(text), before.coursework[index]);
    assert.equal(panel.querySelectorAll('li').length, before.coursework[index].length);
    assert.match(text(panel.querySelector('summary')), /Relevant Coursework & Tools/);
    assert.equal(text(panel.querySelector('.resume-disclosure-title')), 'Relevant Coursework & Tools');
  });
});

test('R-RESUME-03: each role retains its first three bullets and one original ordered tool list', () => {
  items('Experience').forEach((role, index) => {
    const original = before.experience[index];
    const visible = role.querySelector('.right-part > .resume-item-points');
    assert.deepEqual([...visible.querySelectorAll('li')].map(text), original.bullets.slice(0, 3));
    const more = role.querySelector('.resume-contributions');
    assert.equal(Boolean(more), original.bullets.length > 3);
    if (more) {
      assert.deepEqual([...more.querySelectorAll('li')].map(text), original.bullets.slice(3));
      assert.equal(text(more.querySelector('.resume-when-closed')), `Show More (+${original.bullets.length - 3})`);
    }
    const list = role.querySelector('.resume-item-tags');
    assert.equal(list.tagName, 'UL');
    assert.deepEqual([...list.children].map(text), original.tools);
    assert.equal(role.querySelectorAll('.resume-item-tags').length, 1);
    const tools = role.querySelector('details.resume-tools');
    assert.equal(Boolean(tools), original.tools.length > 10);
    if (tools) {
      const preview = [...tools.querySelectorAll('.resume-disclosure-preview .resume-tag')].map(text);
      assert.ok(preview.length > 0 && preview.length <= 8);
      assert.ok(preview.every(tool => original.tools.includes(tool)));
      assert.equal(new Set(preview).size, preview.length);
    }
  });
  assert.equal(section('Engineering Contributions').querySelector('details'), null);
  assert.equal(resume.querySelectorAll('summary details').length, 0);
  assert.ok([...resume.querySelectorAll('details')].every(node => !node.hasAttribute('open') && !node.hasAttribute('name')));
});

test('R-RESUME-04: certificates preserve all fourteen issuers and original safe links, with six initially outside details', () => {
  assert.deepEqual(items('Certifications').map(item => {
    const link = item.querySelector('a');
    return { issuer: text(item.querySelector('.item-period')), title: text(link).replace(/\s*↗$/, ''), href: link.getAttribute('href'), target: link.getAttribute('target'), rel: link.getAttribute('rel') };
  }), before.certifications);
  assert.equal(items('Certifications').filter(node => !node.closest('details')).length, 6);
  assert.equal(section('Certifications').querySelectorAll('details').length, 1);
  assert.equal(section('Certifications').querySelectorAll('details .timeline-item').length, 8);
});

test('R-RESUME-05: generated Markdown keeps closed content once and omits interaction-only previews and labels', async () => {
  const markdown = toMarkdown(`<html><body>${resume.outerHTML}</body></html>`, 'https://ferhattufekci.github.io');
  assert.doesNotMatch(markdown, /Show More|Show Less|Jump to Section|Read full summary|Show less|View all tools|Show fewer tools|Hide coursework|View courses|\+\d+ more|View \d+ more contributions|Hide additional contributions|View all 14 certifications/);
  assert.equal(markdown.split('Download Full Resume').length - 1, 1, 'Only the existing PDF action is exported');
  for (const paragraph of before.summary) assert.ok(markdown.replace(/\s+/g, ' ').includes(paragraph));
  for (const school of before.coursework) for (const term of school) assert.ok(markdown.includes(term), term);
  for (const role of before.experience) for (const bullet of role.bullets) assert.ok(markdown.replace(/\s+/g, ' ').includes(bullet), bullet);
  const bulletLines = html => [...toMarkdown(`<html><body>${html}</body></html>`, 'https://ferhattufekci.github.io').matchAll(/^-\s+(.*)$/gm)].map(match => match[1]);
  [...section('Education').querySelectorAll('details')].forEach((panel, index) => {
    assert.deepEqual(bulletLines(panel.outerHTML), before.coursework[index], 'Markdown includes every course once, with no decorative preview duplicates');
  });
  items('Experience').forEach((role, index) => {
    const tools = role.querySelector('.resume-tools') || role.querySelector('.resume-item-tags');
    assert.deepEqual(bulletLines(tools.outerHTML), before.experience[index].tools, 'Markdown keeps every original tool once and in order');
  });
  const output = await readFile(join(ROOT, 'index.md'), 'utf8');
  assert.ok(output.includes(markdown.trim()), 'Generated index.md matches the complete semantic Resume content');
});
