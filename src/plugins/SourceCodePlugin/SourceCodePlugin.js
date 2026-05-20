/**
 * SourceCodePlugin — toggles a modal that lets the user view and edit
 * the underlying HTML of the document. Backed by MiniCodeEditor, our
 * zero-dependency code view (no CodeMirror, no Lezer, no extra packages).
 *
 * Lifecycle:
 *   • Button "Source Code" (or Ctrl+Shift+S) opens a modal containing the
 *     editor pre-loaded with the formatted current document HTML.
 *   • On Submit, the new HTML is sanitised through the editor's sanitiser
 *     and applied via editor.setContent(); history.pushImmediate() records
 *     it as a single undo step in the surrounding editor.
 *   • Unsaved changes trigger a confirmation prompt before closing.
 *   • The modal participates in Penman's theme system — the inner code
 *     view re-themes automatically because its CSS reads from the same
 *     [data-theme] attribute the rest of the editor uses.
 */

import { formatHTML } from './formatHTML.js';
import { MiniCodeEditor } from './MiniCodeEditor.js';
import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';
import __icons from './icons/index.js';
import './sourcecode.css';

let activeModal = null;

export function setupSourceCodePlugin(editor) {
  // Register plugin-owned data (lang + icons). Self-contained: removing
  // this plugin removes its strings and icons cleanly.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.sourceCode', { fa: __faStrings, en: __enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(__icons);
  }

  // 1. Toolbar button
  editor.ui.registry.addButton('sourcecode', {
    iconName: 'sourcecode',
    text: editor.i18n.t('plugins.sourceCode.title'),
    onAction: () => openSourceCodeModal(editor)
  });

  // 2. Keyboard shortcut: Ctrl + Shift + S (works whether focus is inside
  //    the editor or inside the source modal).
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
      const isInsideEditor = editor.editableArea.contains(document.activeElement)
                          || editor.editableArea === document.activeElement;
      const isInsideModal = activeModal && activeModal._modal
                         && activeModal._modal.modalElement
                         && activeModal._modal.modalElement.contains(document.activeElement);
      if (isInsideEditor || isInsideModal || !activeModal) {
        e.preventDefault();
        openSourceCodeModal(editor);
      }
    }
  });
}

function openSourceCodeModal(editor) {
  // Toggle behavior — a second invocation closes the open modal.
  if (activeModal) {
    activeModal.close();
    return;
  }

  let mce = null;
  const initialHtml = formatHTML(editor.getContent());
  let isSaved = false;

  // Build the modal body: header row (search + nav + replace toggle +
  // format), an optional replace row (hidden until toggled), and the
  // code editor mount point.
  const customBody = document.createElement('div');
  customBody.className = 'penman-source-code-modal-body';
  customBody.style.margin = '-16px -20px';  // cancel FormModal's default padding
  customBody.innerHTML = `
    <div class="penman-source-code-header" dir="ltr">
      <input type="text" id="penman-mce-search"
             class="penman-source-code-search"
             placeholder="${editor.i18n.t('plugins.sourceCode.searchPlaceholder')}"
             autocomplete="off" dir="auto" style="margin: 0;" />
      <button type="button" id="penman-mce-prev" class="penman-btn"
              title="${editor.i18n.t('plugins.sourceCode.findPrev')}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round"
             stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
      </button>
      <button type="button" id="penman-mce-next" class="penman-btn"
              title="${editor.i18n.t('plugins.sourceCode.findNext')}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round"
             stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <button type="button" id="penman-mce-replace-toggle"
              class="penman-btn pm-btn-replace">
        ${editor.i18n.t('plugins.sourceCode.replace')}
      </button>
      <button type="button" id="penman-mce-format"
              class="penman-btn pm-btn-format">
        ${editor.i18n.t('plugins.sourceCode.format')}
      </button>
    </div>
    <div class="penman-source-code-replace-row" dir="ltr">
      <input type="text" id="penman-mce-replace"
             placeholder="${editor.i18n.t('plugins.sourceCode.replacePlaceholder')}"
             autocomplete="off" dir="auto" style="margin-top:0;" />
      <button type="button" id="penman-mce-replace-one" class="penman-btn">
        ${editor.i18n.t('plugins.sourceCode.replace')}
      </button>
      <button type="button" id="penman-mce-replace-all" class="penman-btn">
        ${editor.i18n.t('plugins.sourceCode.replaceAll')}
      </button>
    </div>
    <div id="penman-source-code-container"
         class="penman-source-code-container" dir="ltr"></div>
  `;

  const formModal = editor.ui.createFormModal({
    title: editor.i18n.t('plugins.sourceCode.title'),
    width: '800px',
    submitText: editor.i18n.t('plugins.sourceCode.apply'),
    cancelText: editor.i18n.t('ui.cancel'),
    fields: [{ type: 'custom', render: () => customBody }],
    onSubmit: () => {
      if (!mce) return;
      const newHtml = mce.getValue();
      const scrollTop = editor.editableArea.scrollTop;

      // DOMParser is forgiving — we just want a basic structural check
      // before letting the sanitiser run on potentially-broken input.
      try { new DOMParser().parseFromString(newHtml, 'text/html'); } catch (_) { /* noop */ }

      const sanitizedHTML = editor.sanitizer.sanitize(newHtml);
      editor.setContent(sanitizedHTML);
      if (editor.history) editor.history.pushImmediate();

      editor.editableArea.scrollTop = scrollTop;
      isSaved = true;
    }
  });

  // Intercept all close paths (X, overlay click, ESC, Cancel) so unsaved
  // changes always prompt. We wrap the underlying Modal.close().
  const underlying = formModal._modal;
  const originalClose = underlying.close.bind(underlying);
  underlying.close = function () {
    if (mce && !isSaved) {
      const currentHtml = mce.getValue();
      if (currentHtml !== initialHtml) {
        editor.ui.createFormModal({
          title: editor.i18n.t('ui.confirm'),
          fields: [{
            type: 'html',
            html: `<p>${editor.i18n.t('plugins.sourceCode.unsavedChanges')}</p>`
          }],
          submitText: editor.i18n.t('ui.discard'),
          cancelText: editor.i18n.t('ui.cancel'),
          onSubmit: () => {
            originalClose();
            cleanup();
          }
        });
        return;
      }
    }
    originalClose();
    cleanup();
  };

  function cleanup() {
    if (mce) { mce.destroy(); mce = null; }
    if (typeof editor.off === 'function') editor.off('themeChange', onThemeChange);
    activeModal = null;
  }

  activeModal = formModal;

  // Mount the MiniCodeEditor into the container.
  const container = customBody.querySelector('#penman-source-code-container');
  mce = new MiniCodeEditor({
    parent: container,
    value: initialHtml,
    height: '420px'
  });
  // Focus shortly after the modal lays out so the caret blinks on open.
  setTimeout(() => mce.focus(), 50);

  // Theme reactivity: keep the source editor's palette in lock-step with
  // the host editor. MiniCodeEditor.setTheme() applies an explicit
  // .pm-mce-light / .pm-mce-dark class on its own root, which is the
  // only thing our CSS keys off — no fragile :root[data-theme] reliance.
  const onThemeChange = (theme) => {
    if (mce && typeof mce.setTheme === 'function') mce.setTheme(theme);
  };
  if (typeof editor.on === 'function') editor.on('themeChange', onThemeChange);
  // Apply current theme immediately (in case it was set before we opened).
  if (typeof editor.getTheme === 'function') {
    mce.setTheme(editor.getTheme());
  }

  // ─── Wire header controls ────────────────────────────────────────────
  const $ = (id) => customBody.querySelector(id);
  const header = customBody.querySelector('.penman-source-code-header');
  const searchInput = $('#penman-mce-search');
  const replaceInput = $('#penman-mce-replace');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => mce.setSearch(e.target.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.shiftKey ? mce.findPrev() : mce.findNext();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        mce.setSearch('');
        searchInput.value = '';
        mce.focus();
      }
    });
  }
  $('#penman-mce-prev')?.addEventListener('click', () => mce.findPrev());
  $('#penman-mce-next')?.addEventListener('click', () => mce.findNext());

  // Replace row toggle
  $('#penman-mce-replace-toggle')?.addEventListener('click', () => {
    header.classList.toggle('is-open');
    if (header.classList.contains('is-open')) {
      replaceInput?.focus();
    } else {
      mce.focus();
    }
  });

  // Ctrl+H inside the modal opens the replace row.
  customBody.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      header.classList.add('is-open');
      replaceInput?.focus();
    }
    if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      searchInput?.focus();
      searchInput?.select();
    }
  });

  $('#penman-mce-replace-one')?.addEventListener('click', () => {
    if (!searchInput?.value) return;
    mce.setSearch(searchInput.value);
    mce.replace(replaceInput?.value || '');
  });
  $('#penman-mce-replace-all')?.addEventListener('click', () => {
    if (!searchInput?.value) return;
    mce.setSearch(searchInput.value);
    const n = mce.replaceAll(replaceInput?.value || '');
    if (n > 0) {
      // Brief feedback in the search input placeholder slot — kept inline
      // (no toast dependency).
      const old = searchInput.placeholder;
      searchInput.placeholder = editor.i18n.t('plugins.sourceCode.replaceAllDone', { count: n });
      setTimeout(() => { if (searchInput) searchInput.placeholder = old; }, 1800);
    }
  });

  // Format / beautify
  $('#penman-mce-format')?.addEventListener('click', () => {
    if (!mce) return;
    mce.setValue(formatHTML(mce.getValue()));
    mce.focus();
  });
}
