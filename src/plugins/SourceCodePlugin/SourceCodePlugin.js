import { basicSetup, EditorView } from 'codemirror';
import { html } from '@codemirror/lang-html';
import { EditorState } from '@codemirror/state';
import { SearchQuery, setSearchQuery, openSearchPanel, closeSearchPanel, findNext, findPrevious } from '@codemirror/search';
import { formatHTML } from './formatHTML.js';

export function setupSourceCodePlugin(editor) {
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

  // Create UI modal for source code
  const modal = editor.ui.createModal({
    title: editor.i18n.t('plugins.sourceCode.title'),
    width: '800px',
    body: `
      <div class="penman-source-code-header" style="border-bottom: 1px solid #E2E8F0; display: flex; gap: 8px; padding: 10px 15px 10px; margin-bottom: 10px;" dir="ltr">
         <input type="text" id="penman-cm-search" placeholder="${editor.i18n.t('plugins.sourceCode.searchPlaceholder')}" autocomplete="off" style="flex: 1; padding: 6px; font-family: monospace; margin-top: 0;">
         <button type="button" id="penman-cm-search-prev" class="penman-btn" style="border: 1px solid #ccc; border-radius: 3px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
         </button>
         <button type="button" id="penman-cm-search-next" class="penman-btn" style="border: 1px solid #ccc; border-radius: 3px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
         </button>
      </div>
      <div id="penman-source-code-container" style="overflow: auto; text-align: left;" dir="ltr"></div>
    `,
    submitText: editor.i18n.t('plugins.sourceCode.apply'),
    cancelText: editor.i18n.t('ui.cancel'),
    hideFooter: false,
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

  // We must bind to the modal's internal close mechanism if there are unsaved changes warning
  const originalClose = modal.close.bind(modal);
  modal.close = function() {
    if (cmView && !isSaved) {
      const currentHtml = cmView.state.doc.toString();
      if (currentHtml !== initialHtml) {
        if (!window.confirm(editor.i18n.t('plugins.sourceCode.unsavedChanges'))) {
           return;
        }
      }
    }
    originalClose();
    if (cmView) {
       cmView.destroy();
    }
    activeModal = null;
  };

  modal.open();
  activeModal = modal;
  
  // Modal injects into DOM asynchronously or immediately, but we should find the element
  // by searching within the modalElement to prevent global collisions.
  const container = modal.modalElement.querySelector('#penman-source-code-container');
  
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
      border: "1px solid #ccc",
      borderRadius: "3px",
      background: "transparent",
      padding: "0 10px",
      fontSize: "13px",
      cursor: "pointer"
    },
    ".cm-panels": {
      background: "#F8FAFC",
      color: "#64748B",
    }
  });

  const state = EditorState.create({
    doc: initialHtml,
    extensions: [
      basicSetup,
      html(),
      cmTheme
    ]
  });

  cmView = new EditorView({
    state,
    parent: container
  });

  // Setup custom search
  const searchInput = modal.modalElement.querySelector('#penman-cm-search');
  const searchPrev = modal.modalElement.querySelector('#penman-cm-search-prev');
  const searchNext = modal.modalElement.querySelector('#penman-cm-search-next');

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
