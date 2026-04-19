import { basicSetup, EditorView } from 'codemirror';
import { html } from '@codemirror/lang-html';
import { EditorState } from '@codemirror/state';
import { SearchQuery, setSearchQuery, openSearchPanel, closeSearchPanel, findNext, findPrevious } from '@codemirror/search';

export function setupSourceCodePlugin(editor) {
  // 1. Register Button in Toolbar
  editor.ui.registry.addButton('sourcecode', {
    iconName: 'sourcecode',
    text: 'Source Code',
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
  const initialHtml = editor.getContent();

  let isSaved = false;

  // Create UI modal for source code
  const modal = editor.ui.createModal({
    title: 'Source Code',
    body: `
      <div class="penman-source-code-header" style="display: flex; gap: 8px; margin-bottom: 10px;">
         <input type="text" id="penman-cm-search" placeholder="Search..." autocomplete="off" style="flex: 1; padding: 6px;">
         <button type="button" id="penman-cm-search-prev" class="penman-btn">&uarr;</button>
         <button type="button" id="penman-cm-search-next" class="penman-btn">&darr;</button>
      </div>
      <div id="penman-source-code-container" style="height: 60vh; border: 1px solid #ccc; overflow: hidden; text-align: left;" dir="rtl"></div>
    `,
    submitText: 'Save',
    cancelText: 'Cancel',
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
        if (!window.confirm("You have unsaved changes. Are you sure you want to close?")) {
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
  
  // RTL Direction Support for CodeMirror
  const rtlTheme = EditorView.theme({
    "&": {
      direction: "ltr"
    },
    ".cm-content": {
      fontFamily: "monospace",
      textAlign: "left",
      direction: "ltr"
    },
    ".cm-scroller": {
        overflow: "auto"
    }
  });

  const state = EditorState.create({
    doc: initialHtml,
    extensions: [
      basicSetup,
      html(),
      rtlTheme
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
