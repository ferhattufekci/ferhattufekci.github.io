/* Native disclosure and browser API adapter. No storage, tracking or network. */
(function (root) {
  'use strict';
  var doc = root.document, data = root.PortfolioBlogSharingData;
  var current = null, sequence = 0, locks = { clipboard: null, native: null };
  var sharePath = 'M9 10.5 15 7M9 13.5l6 3.5M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z';
  var progressPath = 'M21 12a9 9 0 1 1-9-9';
  var messages = {
    tr: {
      SHARE: 'Paylaş', COPY: 'Bağlantıyı Kopyala', ARTICLE_URL: 'Yazı bağlantısı',
      COPY_PENDING: 'Bağlantı kopyalanıyor.', COPY_BUSY: 'Bir kopyalama işlemi sürüyor. Bitince yeniden deneyin.',
      COPY_SUCCESS: 'Bağlantı Kopyalandı', COPY_MANUAL: 'Otomatik kopyalanamadı. Bağlantıyı seçip kopyalayın.',
      NATIVE_PENDING: 'Paylaşım sürüyor…', NATIVE_BUSY: 'Paylaşım sürüyor. Lütfen bekleyin.',
      NATIVE_ABORT: 'Paylaşım yapılmadı.', NATIVE_ERROR: 'Paylaşım açılamadı. Bağlantıyı kopyalayabilirsiniz.'
    },
    en: {
      SHARE: 'Share', COPY: 'Copy Link', ARTICLE_URL: 'Article link',
      COPY_PENDING: 'Copying the link.', COPY_BUSY: 'A copy operation is in progress. Try again when it finishes.',
      COPY_SUCCESS: 'Link Copied', COPY_MANUAL: 'Automatic copying was unavailable. Select and copy the link.',
      NATIVE_PENDING: 'Sharing…', NATIVE_BUSY: 'Sharing… Please wait.',
      NATIVE_ABORT: 'Sharing was not completed.', NATIVE_ERROR: 'Sharing unavailable. You can copy the link.'
    }
  };
  function element(tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function button(className, text) {
    var node = element('button', className);
    node.type = 'button';
    var icon = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true'); icon.setAttribute('focusable', 'false');
    var path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', className === 'blog-share-trigger'
      ? sharePath
      : 'M9 9h12v12H9ZM15 9V3H3v12h6');
    icon.appendChild(path); node.appendChild(element('span', '', text)); node.appendChild(icon);
    return node;
  }
  function nativeAvailable(payload) {
    var nav = root.navigator;
    return data.canUseNativeShare({ isSecureContext: root.isSecureContext, share: nav.share,
      canShare: typeof nav.canShare === 'function' ? function (value) { return nav.canShare(value); } : undefined }, payload);
  }
  function active(record, session) {
    var page = record.card.closest('.pt-page');
    return current === record && record.session === session && record.card.isConnected &&
      (record.mode === 'native' || !record.panel.hidden) && page && page.classList.contains('pt-page-current') && !page.hasAttribute('inert');
  }
  function mode(record, value, expanded) {
    record.mode = value;
    record.panel.dataset.mode = value;
    record.actions.hidden = value !== 'fallback';
    if (value === 'fallback') {
      delete record.panel.dataset.inline;
      record.trigger.setAttribute('aria-controls', record.panel.id);
      record.trigger.setAttribute('aria-expanded', String(!!expanded));
      record.panel.hidden = !expanded;
    } else {
      record.trigger.removeAttribute('aria-controls');
      record.trigger.removeAttribute('aria-expanded');
      // A zero-flow native surface keeps the same live region exposed even
      // before its first update; hidden/display:none would suppress it.
      record.panel.hidden = false;
      record.panel.dataset.inline = String(!record.statusKey || /^NATIVE_(PENDING|BUSY)$/.test(record.statusKey));
    }
  }
  function status(record, key, kind) {
    var state = !key ? 'idle' : /_(PENDING|BUSY)$/.test(key) ? 'pending'
      : /_SUCCESS$/.test(key) ? 'success' : key === 'NATIVE_ABORT' ? 'info' : 'error';
    record.status.textContent = '';
    record.status.dataset.state = state;
    record.feedback.dataset.state = state;
    if (key) {
      var icon = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true'); icon.setAttribute('focusable', 'false');
      var path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', state === 'success' ? 'M20 6 9 17l-5-5'
        : state === 'pending' ? 'M21 12a9 9 0 1 1-9-9'
          : state === 'info' ? 'M12 11v6m0-10v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'
            : 'M12 3 2 21h20ZM12 9v5m0 3v.01');
      icon.appendChild(path); record.status.appendChild(icon);
      record.status.appendChild(element('span', '', record.text[key]));
    }
    record.statusKind = kind || null;
    record.statusKey = key || null;
    if (record.mode === 'native') {
      record.panel.hidden = false;
      record.panel.dataset.inline = String(!key || /^NATIVE_(PENDING|BUSY)$/.test(key));
    }
  }
  function nativeBusy(record, busy) {
    record.trigger.setAttribute('aria-busy', String(busy));
    record.trigger.querySelector('path').setAttribute('d', busy ? progressPath : sharePath);
  }
  function availability() {
    if (!current) return;
    current.copy.setAttribute('aria-busy', String(!!locks.clipboard));
    nativeBusy(current, current.mode === 'native' && !!locks.native);
  }
  function close() {
    if (!current) return;
    var record = current;
    current = null;
    record.session++;
    record.panel.hidden = true;
    status(record, null);
    record.manual.hidden = true;
    record.input.value = '';
    nativeBusy(record, false);
    mode(record, nativeAvailable(record.payload) ? 'native' : 'fallback', false);
  }
  function begin(record, value) {
    close(); current = record; record.session++;
    status(record, null); record.manual.hidden = true; record.input.value = '';
    mode(record, value, true); availability();
  }
  function finish(operation, error) {
    var kind = operation.kind, record = operation.record;
    if (locks[kind] !== operation) return;
    locks[kind] = null;
    // Only clear the current panel's own busy feedback. Old results never own
    // the new opening; another API's newer message must also remain intact.
    if (current && current.statusKind === kind + '-busy') status(current, null);
    availability();
    if (!active(record, operation.session)) return;
    if (kind === 'clipboard') {
      if (error) manual(record);
      else status(record, 'COPY_SUCCESS');
    } else if (!error) {
      status(record, null);
    } else {
      if (error.name !== 'AbortError') mode(record, 'fallback', true);
      status(record, error.name === 'AbortError' ? 'NATIVE_ABORT' : 'NATIVE_ERROR');
    }
  }
  function manual(record) {
    record.input.value = record.payload.url;
    record.manual.hidden = false;
    status(record, 'COPY_MANUAL');
    // Focus and selection belong to the user; never focus/select this field.
  }
  function invoke(record, kind) {
    if (!active(record, record.session)) return;
    if (locks[kind]) {
      status(record, kind === 'clipboard' ? 'COPY_BUSY' : 'NATIVE_BUSY', kind + '-busy');
      return;
    }
    var operation = { record: record, session: record.session, kind: kind };
    locks[kind] = operation;
    availability();
    status(record, kind === 'clipboard' ? 'COPY_PENDING' : 'NATIVE_PENDING');
    var result;
    try {
      if (kind === 'clipboard') {
        var clipboard = root.navigator.clipboard;
        if (!clipboard || typeof clipboard.writeText !== 'function') throw new Error('Clipboard unavailable');
        result = clipboard.writeText(record.payload.url);
      } else {
        if (!nativeAvailable(record.payload)) throw new Error('Device sharing unavailable');
        // Deliberately synchronous in the trusted activation call stack.
        result = root.navigator.share(record.payload);
      }
    } catch (error) { finish(operation, error || new Error('Operation failed')); return; }
    Promise.resolve(result).then(function () { finish(operation, null); }, function (error) { finish(operation, error || new Error('Operation failed')); });
  }
  function attach(card, article, lang) {
    var payload = data.prepareShareData(article);
    if (!payload) return;
    var text = messages[lang === 'tr' ? 'tr' : 'en'], id = 'blog-share-' + (++sequence);
    var trigger = button('blog-share-trigger', text.SHARE);
    trigger.setAttribute('aria-label', text.SHARE + ': ' + payload.title);
    var panel = element('div', 'blog-share-panel'); panel.id = id; panel.hidden = true;
    var actions = element('div', 'blog-share-actions');
    var copy = button('blog-share-copy', text.COPY); actions.appendChild(copy);
    var notice = element('p', 'blog-share-status'); notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite');
    var feedback = element('div', 'blog-share-feedback'); feedback.dataset.state = 'idle';
    var fallback = element('div', 'blog-share-manual'); fallback.hidden = true;
    var label = element('label', '', text.ARTICLE_URL); label.htmlFor = id + '-url';
    var input = element('input'); input.id = id + '-url'; input.type = 'text'; input.readOnly = true;
    fallback.appendChild(label); fallback.appendChild(input);
    feedback.appendChild(notice); feedback.appendChild(fallback);
    panel.appendChild(actions); panel.appendChild(feedback);
    card.appendChild(trigger); card.appendChild(panel);
    var record = { card: card, trigger: trigger, panel: panel, status: notice, manual: fallback,
      feedback: feedback, actions: actions, input: input, copy: copy, payload: payload, text: text, session: 0, statusKind: null, mode: null };
    nativeBusy(record, false);
    mode(record, nativeAvailable(payload) ? 'native' : 'fallback', false);
    trigger.addEventListener('click', function () {
      if (nativeAvailable(payload)) {
        if (current !== record || record.mode !== 'native' || !locks.native) begin(record, 'native');
        invoke(record, 'native');
      } else {
        if (current === record && record.mode === 'fallback') { close(); return; }
        begin(record, 'fallback');
      }
    });
    copy.addEventListener('click', function () { invoke(record, 'clipboard'); });
  }
  doc.addEventListener('click', function (event) {
    if (current && !current.trigger.contains(event.target) && !current.panel.contains(event.target)) close();
  });
  doc.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !current || (!current.trigger.contains(event.target) && !current.panel.contains(event.target))) return;
    var trigger = current.trigger;
    close(); event.preventDefault();
    if (trigger.isConnected && trigger.checkVisibility() && !trigger.closest('[inert]')) trigger.focus({ preventScroll: true });
  });
  root.addEventListener('hashchange', close);
  doc.addEventListener('portfolio:page-activate', close);
  root.PortfolioBlogSharing = { attach: attach, close: close };
})(window);
