// Evidence for focus/press assertions that fail only occasionally in CI (R-FILTER-04,
// R-KEYBOARD-08): the failing assertion alone cannot say whether focus was stolen,
// a page was inert, or the mobile drawer was still open. A failure keeps its
// original message and gains the page state at the moment it gave up.
export async function pageFocusState(page) {
  return page.evaluate(() => {
    const name = node => !node ? 'none' : `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}` +
      `${typeof node.className === 'string' && node.className.trim() ? `.${node.className.trim().split(/\s+/).join('.')}` : ''}`;
    const ids = selector => [...document.querySelectorAll(selector)].map(node => node.getAttribute('data-id'));
    return {
      activeElement: name(document.activeElement),
      currentPages: ids('.pt-page-current'),
      inertPages: ids('.pt-page[inert]'),
      menuExpanded: document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') ?? null,
      bodyClass: document.body.className,
      hash: location.hash
    };
  });
}

export async function withFocusState(page, check) {
  try {
    return await check();
  } catch (error) {
    const state = await pageFocusState(page).catch(failure => `unavailable: ${failure.message}`);
    throw new Error(`${error.message}\nFocus diagnostics: ${JSON.stringify(state)}`, { cause: error });
  }
}
