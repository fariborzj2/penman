import { basicSetup, EditorView } from 'codemirror';
import { html } from '@codemirror/lang-html';
import { EditorState, Compartment } from '@codemirror/state';
import { SearchQuery, setSearchQuery, openSearchPanel, closeSearchPanel, findNext, findPrevious } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { formatHTML } from './formatHTML.js';

/**
 * Detect whether the editor should render in dark mode. Checks (in order):
 *   1. The editor's own wrapper [data-theme]
 *   2. The document <html> [data-theme]
 *   3. The OS preference (prefers-color-scheme)
 * "light" anywhere in the chain wins over "auto" / system.
 */
function isDarkMode(editor) {
  const containerTheme = editor && editor.container && editor.container.getAttribute('data-theme');
  if (containerTheme === 'dark')  return true;
  if (containerTheme === 'light') return false;

  const docTheme = typeof document !== 'undefined'
    && document.documentElement.getAttribute('data-theme');
  if (docTheme === 'dark')  return true;
  if (docTheme === 'light') return false;

  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';
import __icons from './icons/index.js';

export function setupSourceCodePlugin(editor) {
  // Register plugin-owned data (lang + icons). Self-contained: removing
  // this plugin removes its strings and icons cleanly.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.sourceCode', { fa: __faStrings, en: __enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(__icons);
  }

  // 1. Register Button in Toolbar
  editor.ui.registry.addButton('sourcecode', {
    iconName: 'sourcecode',
    text: editor.i18n.t('plugins.sourceCode.title'),
    onAction: () => openSourceCodeModal(editor)
  });

  // 2. Keyboard shortcut: Ctrl + Shift + S
  // Global listener to ensure the shortcut works whether focus is in the editor or the codemirror view
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
      // Check if focus is inside the penman editor or our codemirror view before hijacking
      const isInsideEditor = editor.editableArea.contains(document.activeElement) || editor.editableArea === document.activeElement;
      const isInsideCodeMirror = activeModal && activeModal.modalElement && activeModal.modalElement.contains(document.activeElement);
      
      if (isInsideEditor || isInsideCodeMirror || !activeModal) {
          e.preventDefault();
          openSourceCodeModal(editor);
      }
    }
  });
}

let activeModal = null;

function openSourceCodeModal(editor) {
  if (activeModal) {
    activeModal.close();
    return;
  }

  let cmView = null;
  const initialHtml = formatHTML(editor.getContent());

  let isSaved = false;

  // Build the custom body: a search bar above the CodeMirror container.
  // Wrapped in a single `custom` field of a FormModal so the footer
  // (Apply / Cancel) follows the standard pattern across plugins.
  const customBody = document.createElement('div');
  customBody.className = 'penman-source-code-modal-body';
  customBody.style.margin = '-16px -20px'; // Offset the FormModal's default padding to allow the search bar to stretch full width
  customBody.innerHTML = `
    <div class="penman-source-code-header" dir="ltr">
       <input type="text" id="penman-cm-search" class="penman-source-code-search" placeholder="${editor.i18n.t('plugins.sourceCode.searchPlaceholder')}" autocomplete="off" style="margin: 0;" />
       <button type="button" id="penman-cm-search-prev" class="penman-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
       </button>
       <button type="button" id="penman-cm-search-next" class="penman-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
       </button>
    </div>
    <div id="penman-source-code-container" class="penman-source-code-container" dir="ltr"></div>
  `;

  // Create UI modal for source code
  const formModal = editor.ui.createFormModal({
    title: editor.i18n.t('plugins.sourceCode.title'),
    width: '800px',
    submitText: editor.i18n.t('plugins.sourceCode.apply'),
    cancelText: editor.i18n.t('ui.cancel'),
    fields: [
      { type: 'custom', render: () => customBody }
    ],
    onSubmit: (data) => {
      if (cmView) {
        const newHtml = cmView.state.doc.toString();
        
        // Save scroll position
        const scrollTop = editor.editableArea.scrollTop;

        // Verify HTML using DOMParser (basic validation per spec)
        const doc = new DOMParser().parseFromString(newHtml, 'text/html');
        // Simple check to see if it's completely broken
        
        // Pass to sanitizer first to maintain security before inserting
        const sanitizedHTML = editor.sanitizer.sanitize(newHtml);
        
        editor.setContent(sanitizedHTML);
        
        if (editor.history) {
            editor.history.pushImmediate();
        }

        // Restore scroll
        editor.editableArea.scrollTop = scrollTop;
        isSaved = true;
      }
    },
    onCancel: () => {
      // Discard changes
    }
  });

  // Intercept close to confirm unsaved changes. We override formModal.close
  // (which delegates to the underlying Modal) so all close paths route through
  // this check (overlay click, ESC, Cancel button, X button).
  const underlying = formModal._modal;
  const originalClose = underlying.close.bind(underlying);
  underlying.close = function() {
    if (cmView && !isSaved) {
      const currentHtml = cmView.state.doc.toString();
      if (currentHtml !== initialHtml) {
        editor.ui.createFormModal({
          title: editor.i18n.t('ui.confirm'),
          fields: [
            { type: 'html', html: `<p>${editor.i18n.t('plugins.sourceCode.unsavedChanges')}</p>` }
          ],
          submitText: editor.i18n.t('ui.discard'),
          cancelText: editor.i18n.t('ui.cancel'),
          onSubmit: () => {
            originalClose();
            if (cmView) cmView.destroy();
            if (typeof editor.off === 'function') editor.off('themeChange', onThemeChange);
            activeModal = null;
          }
          // onCancel: keep the source code modal open — nothing to do
        });
        return;
      }
    }
    originalClose();
    if (cmView) cmView.destroy();
    if (typeof editor.off === 'function') editor.off('themeChange', onThemeChange);
    activeModal = null;
  };

  activeModal = formModal;

  // CodeMirror attaches into the custom body's container element.
  const container = customBody.querySelector('#penman-source-code-container');
  
  // Theme configuration for CodeMirror
  const cmTheme = EditorView.theme({
    "&": {
      direction: "ltr"
    },
    ".cm-content": {
      fontFamily: "monospace",
      textAlign: "left",
      direction: "ltr",
      lineHeight: "1.6"
    },
    ".cm-line": {
      direction: "ltr",
      textAlign: "left"
    },
    ".cm-scroller": {
      overflow: "auto",
      minHeight: "400px",
      maxHeight: "400px"
    },
    ".cm-scroller": {
      overflow: "auto",
      minHeight: "400px",
      maxHeight: "400px"
    },
    ".cm-panel": {
      padding: "15px !important"
    },
    ".cm-textfield": {
      height: "28px",
    },
    ".cm-button": {
      height: "28px",
      border: "1px solid var(--pm-border)",
      borderRadius: "3px",
      background: "transparent",
      color: "var(--pm-text)",
      padding: "0 10px",
      fontSize: "13px",
      cursor: "pointer"
    },
    ".cm-panels": {
      background: "var(--pm-bg-toolbar)",
      color: "var(--pm-text-muted)",
    },
    ".cm-textfield": {
      height: "28px",
      background: "var(--pm-bg)",
      color: "var(--pm-text)",
      border: "1px solid var(--pm-border)",
    }
  });

  // Use a Compartment for the dark-syntax theme so we can swap it live when
  // the editor's theme changes (e.g. user toggles dark/light while the modal
  // is open). When dark, append `oneDark` after basicSetup so its syntax
  // tokens (keyword blue, string red/green, etc.) override the default
  // light-mode highlighting that's invisible on a dark background.
  const darkSyntaxCompartment = new Compartment();

  const state = EditorState.create({
    doc: initialHtml,
    extensions: [
      basicSetup,
      html(),
      cmTheme,
      darkSyntaxCompartment.of(isDarkMode(editor) ? oneDark : [])
    ]
  });

  cmView = new EditorView({
    state,
    parent: container
  });

  // React to theme switches at the editor level. Editor.setTheme() emits
  // 'themeChange'. We reconfigure the dark-syntax compartment so the colors
  // update without rebuilding the view (preserves selection, scroll, etc.).
  const onThemeChange = () => {
    if (!cmView) return;
    cmView.dispatch({
      effects: darkSyntaxCompartment.reconfigure(isDarkMode(editor) ? oneDark : [])
    });
  };
  editor.on('themeChange', onThemeChange);

  // Setup custom search
  const searchInput = customBody.querySelector('#penman-cm-search');
  const searchPrev = customBody.querySelector('#penman-cm-search-prev');
  const searchNext = customBody.querySelector('#penman-cm-search-next');

  if (searchInput) {
      searchInput.addEventListener('input', (e) => {
          const query = new SearchQuery({search: e.target.value});
          cmView.dispatch({effects: setSearchQuery.of(query)});
      });
  }
  
  if (searchPrev) {
      searchPrev.addEventListener('click', () => {
          findPrevious(cmView);
      });
  }

  if (searchNext) {
      searchNext.addEventListener('click', () => {
          findNext(cmView);
      });
  }
}
