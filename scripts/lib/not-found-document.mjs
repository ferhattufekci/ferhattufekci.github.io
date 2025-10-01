import { parseHTML } from 'linkedom';
import { renderDocument } from './agent-documents.mjs';

// Extract the authored shell rather than maintaining a second portfolio template.
export function renderNotFoundDocument({ source, errorCard, origin, themeBoot }) {
  const { document: portfolio } = parseHTML(source.replace(/\r\n/g, '\n'));
  const { document } = parseHTML(renderDocument({
    title: errorCard.content.title, description: errorCard.content.message,
    path: '/404.html', body: '', indexable: false, origin, themeBoot
  }));
  document.body.removeAttribute('class');
  const selectors = ['#site_header', '.mobile-header', '.mobile-menu-overlay', '.lmpixels-arrows-nav'];
  const shell = selectors.map(selector => {
    const original = portfolio.querySelector(selector);
    if (!original) throw new Error('Missing portfolio shell element: ' + selector);
    const node = original.cloneNode(true);
    node.querySelectorAll('script, style, #calendlyContainer').forEach(element => element.remove());
    for (const element of node.querySelectorAll('[href], [src]')) {
      for (const attribute of ['href', 'src']) {
        const value = element.getAttribute(attribute);
        if (value && !/^(?:\/|https?:|mailto:|tel:)/i.test(value)) element.setAttribute(attribute, '/' + value);
      }
    }
    if (node.matches('.lmpixels-arrows-nav')) {
      for (const [index, control] of [...node.children].entries()) {
        const link = document.createElement('a');
        link.className = control.className;
        link.href = index === 0 ? '/#contact' : '/#about-me';
        link.setAttribute('aria-label', index === 0 ? 'Previous section: Contact' : 'Next section: About Me');
        link.innerHTML = control.innerHTML;
        control.replaceWith(link);
      }
    }
    return node.outerHTML;
  });
  document.head.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.remove());
  for (const original of portfolio.querySelectorAll('head link[rel="stylesheet"]')) {
    const href = original.getAttribute('href');
    if (/^https?:/i.test(href)) continue; // Third-party widgets are not part of the shell.
    const link = original.cloneNode(true);
    link.setAttribute('href', href.startsWith('/') ? href : '/' + href);
    document.head.appendChild(link);
  }
  document.documentElement.lang = portfolio.documentElement.lang || 'en';
  document.body.innerHTML = [
    portfolio.querySelector('body > h1').outerHTML,
    '<div id="page" class="page">', ...shell,
    '<main id="main" class="site-main" aria-labelledby="route-error-title"><div class="pt-wrapper"><div class="subpages">',
    errorCard.renderView(true), '</div></div></main></div>',
    '<script src="/js/theme.js"></script>',
    '<script src="/js/motion-completion.js"></script>',
    '<script src="/js/site-shell.js"></script>'
  ].join('\n');
  return '<!doctype html>\n' + document.documentElement.outerHTML.replace(/^[\t ]+$/gm, '') + '\n';
}
