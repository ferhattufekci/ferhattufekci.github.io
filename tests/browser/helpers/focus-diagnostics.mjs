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

// Evidence for wheel/touch scroll assertions that fail only occasionally (R-PANEL-01): a
// trace showed the wheel landing on content with the panel never moving, and no listener
// that blocks scrolling. A failure keeps its message and gains what was under the pointer
// and whether the scroll owner could scroll at that moment.
export async function pageScrollState(page, area, point) {
  const owner = await area.evaluate((el, { x, y }) => {
    const name = node => !node ? 'none' : `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}` +
      `${typeof node.className === 'string' && node.className.trim() ? `.${node.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''}`;
    const hit = document.elementFromPoint(x, y), style = getComputedStyle(el);
    return {
      atPointer: name(hit), pointerInsideOwner: !!hit && el.contains(hit),
      overflowY: style.overflowY, scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
      ownerInert: !!el.closest('[inert]'), pointerEvents: hit ? getComputedStyle(hit).pointerEvents : null
    };
  }, point);
  return { ...owner, ...(await pageFocusState(page)) };
}

export async function withScrollState(page, area, point, check) {
  try {
    return await check();
  } catch (error) {
    const state = await pageScrollState(page, area, point).catch(failure => `unavailable: ${failure.message}`);
    throw new Error(`${error.message}\nScroll diagnostics: ${JSON.stringify(state)}`, { cause: error });
  }
}
