(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MediumArticleExcerpt = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
    rdquo: '”', ldquo: '“', ccedil: 'ç', Ccedil: 'Ç', gbreve: 'ğ', Gbreve: 'Ğ',
    inodot: 'ı', Idot: 'İ', ouml: 'ö', Ouml: 'Ö', scedil: 'ş', Scedil: 'Ş',
    uuml: 'ü', Uuml: 'Ü',
  };
  var TRAILING_ELLIPSIS = /(?:…|\.{3,})["'”’\])]*\s*$/;
  var OPEN_ENDING = /(?:^|\s)(?:and|or|with|because|ve|veya|ile|çünkü)\s*$/iu;
  var BOILERPLATE = /^(?:continue reading\b|member[- ]only story\b|sign (?:up|in) to (?:read|continue)\b|read (?:this story for free|the (?:full|rest of the) (?:story|article))\b|not a medium member\b|if you(?:['’]re| are)(?: not)? a medium member\b|medium üyesi değilseniz\b)/iu;
  var MIN_INTRO_WORDS = 5;

  function decodeEntities(text) {
    return String(text || '').replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, function (entity, hex, decimal, name) {
      if (name) return ENTITIES[name] || ENTITIES[name.toLowerCase()] || entity;
      var code = parseInt(hex || decimal, hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code) : entity;
    });
  }

  function cleanText(html) {
    var text = String(html || '')
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\b[^>]*>|<\/(?:p|div|li|h[1-6])>/gi, ' ')
      .replace(/<[^>]*>/g, '');
    return decodeEntities(text).replace(/\s+/g, ' ')
      .replace(/\s*Continue reading on\b.*$/i, '').trim();
  }

  function isOpenEnded(text) {
    return OPEN_ENDING.test(text) || (text.match(/\(/g) || []).length > (text.match(/\)/g) || []).length;
  }

  function isPreview(text) {
    return Boolean(text) && !BOILERPLATE.test(text) && !isOpenEnded(text);
  }

  function paragraphTexts(content) {
    // Captions and images are presentation, not introductory copy.
    var html = String(content || '').replace(/<(figure|figcaption)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    var paragraphs = [], match;
    var pattern = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
    while ((match = pattern.exec(html))) {
      if (/\bclass\s*=\s*["'][^"']*\b(?:caption|medium-feed-image|medium-feed-link)\b/i.test(match[1])) continue;
      var text = cleanText(match[2]);
      if (isPreview(text)) paragraphs.push(text);
    }
    return paragraphs;
  }

  function selectExcerpt(sources) {
    var description = paragraphTexts(sources.description)[0] || cleanText(sources.description);
    if (isPreview(description) && !TRAILING_ELLIPSIS.test(description)) return description;

    var paragraphs = paragraphTexts(sources.content).filter(function (text) {
      return (text.match(/\p{L}[\p{L}\p{N}'’-]*/gu) || []).length >= MIN_INTRO_WORDS;
    });
    var complete = paragraphs.find(function (text) {
      return !TRAILING_ELLIPSIS.test(text) && /[.!?]["'”’\])]*$/.test(text);
    });
    if (complete) return complete;

    // An exact original paragraph can corroborate an author's deliberate ellipsis.
    // RSS description must never be passed back as content to manufacture this evidence.
    if (isPreview(description) && paragraphs.indexOf(description) !== -1) return description;
    return '';
  }

  return { cleanText: cleanText, decodeEntities: decodeEntities, selectExcerpt: selectExcerpt };
});
