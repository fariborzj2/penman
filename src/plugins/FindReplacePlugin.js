export function setupFindReplacePlugin(editor) {
  let activeModal = null;

  const openFindReplace = () => {
    if (activeModal) {
      // If modal is already open, focus it and skip opening another one
      const inputFind = activeModal.modalElement.querySelector('#fr-find');
      if (inputFind) inputFind.focus();
      return;
    }

    // Capture current selection to auto-fill the 'Find' input
    let initialFindText = '';
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        // Simple heuristic: if selected text isn't excessively long and spans one block
        const text = sel.toString().trim();
        if (text && text.length < 150 && !text.includes('\n')) {
             initialFindText = text;
        }
    }

    editor.selection.save();

    // State
    let results = [];
    let currentIndex = -1;
    let originalHtml = editor.getContent();

      // Find function
      const performSearch = (query, matchCase) => {
        // We will implement search using TextNodes
        const content = editor.editableArea;
        const textNodes = [];
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null, false);

        let node;
        while ((node = walker.nextNode())) {
          textNodes.push(node);
        }

        results = [];

        if (!query) {
           return results;
        }

        // We combine text to handle cross-node matches? No, simplify for now, match within text nodes.
        // Penman is a simple editor, matching within text nodes is standard unless specified.
        textNodes.forEach(node => {
           const text = node.nodeValue;
           let searchStr = query;
           let textStr = text;
           if (!matchCase) {
             searchStr = searchStr.toLowerCase();
             textStr = textStr.toLowerCase();
           }

           let startIndex = 0;
           let index;
           while ((index = textStr.indexOf(searchStr, startIndex)) > -1) {
             results.push({ node, index, length: query.length });
             startIndex = index + query.length;
           }
        });

        return results;
      };

      const highlightResult = (index, selectAll = false) => {
         if (results.length === 0) return;

         const sel = window.getSelection();
         sel.removeAllRanges();

         if (selectAll) {
             // Add all ranges to selection
             results.forEach(res => {
                 // Check validity
                 if (res.node.parentNode && res.node.nodeValue.length >= res.index + res.length) {
                     const range = document.createRange();
                     try {
                         range.setStart(res.node, res.index);
                         range.setEnd(res.node, res.index + res.length);
                         sel.addRange(range);
                     } catch(e) {}
                 }
             });

             // Scroll to the first one
             const first = results[0];
             if (first && first.node.parentElement && typeof first.node.parentElement.scrollIntoView === 'function') {
                 first.node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
             }
         } else {
             if (index < 0 || index >= results.length) return;
             const result = results[index];

             if (!result.node.parentNode || result.node.nodeValue.length < result.index + result.length) return;

             const range = document.createRange();
             try {
                 range.setStart(result.node, result.index);
                 range.setEnd(result.node, result.index + result.length);
                 sel.addRange(range);

                 // Scroll into view
                 if (result.node.parentElement && typeof result.node.parentElement.scrollIntoView === 'function') {
                    result.node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }
             } catch(e) {}
         }
      };

      const doReplaceAt = (index, replacement) => {
         if (index >= 0 && index < results.length) {
            const result = results[index];

            // Check if node is still valid and has enough length
            if (!result.node.parentNode || result.node.nodeValue.length < result.index + result.length) {
                return false; // Skip if node is invalid or mutated outside
            }

            const range = document.createRange();
            try {
                range.setStart(result.node, result.index);
                range.setEnd(result.node, result.index + result.length);

                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);

                editor.insertContent(replacement);
                return true;
            } catch (e) {
                console.warn('Find and Replace: Range error', e);
                return false;
            }
         }
         return false;
      };

      const doReplace = (replacement) => {
          return doReplaceAt(currentIndex, replacement);
      };

      const modalHtml = `
        <div class="penman-modal-form-row">
          <label for="fr-find">Find</label>
          <input type="text" id="fr-find" placeholder="Find text..." value="${initialFindText.replace(/"/g, '&quot;')}">
        </div>
        <div class="penman-modal-form-row">
          <label for="fr-replace">Replace with</label>
          <input type="text" id="fr-replace" placeholder="Replace with...">
        </div>
        <div class="penman-modal-checkbox-group">
          <label><input type="checkbox" id="fr-match-case"> Match case</label>
          <label><input type="checkbox" id="fr-all-words"> All words</label>
        </div>
      `;

      let updateButtonsState;
      let executeSearch;

      const modal = editor.ui.createModal({
        title: 'Find and Replace',
        body: modalHtml,
        buttons: [
          { text: 'Next', id: 'fr-btn-next', align: 'left', disabled: true, onClick: () => {
             if (results.length === 0) return;
             currentIndex = (currentIndex + 1) % results.length;
             highlightResult(currentIndex, cbAllWords.checked);
          }},
          { text: 'Previous', id: 'fr-btn-prev', align: 'left', disabled: true, onClick: () => {
             if (results.length === 0) return;
             currentIndex = (currentIndex - 1 + results.length) % results.length;
             highlightResult(currentIndex, cbAllWords.checked);
          }},
          { text: 'Find', id: 'fr-btn-find', classNames: 'penman-btn-primary', align: 'right', onClick: () => {
             editor.selection.restore();
             executeSearch();
          }},
          { text: 'Replace', id: 'fr-btn-replace', align: 'right', disabled: true, onClick: () => {
             if (results.length === 0) return;
             const replacement = inputReplace.value;
             if (doReplace(replacement)) {
                 executeSearch();
             }
          }},
          { text: 'Replace all', id: 'fr-btn-replace-all', align: 'right', disabled: true, onClick: () => {
              if (results.length === 0) return;
              const replacement = inputReplace.value;
              if (editor.history && typeof editor.history.takeSnapshot === 'function') {
                  editor.history.takeSnapshot();
              }

              // Reverse iterate through results and modify text directly on nodes to maintain validity
              for (let i = results.length - 1; i >= 0; i--) {
                  const res = results[i];
                  if (res.node && res.node.parentNode) {
                      const nodeText = res.node.nodeValue;
                      // Ensure index is valid
                      if (res.index >= 0 && res.index + res.length <= nodeText.length) {
                          const before = nodeText.substring(0, res.index);
                          const after = nodeText.substring(res.index + res.length);
                          res.node.nodeValue = before + replacement + after;
                      }
                  }
              }
              executeSearch();
          }}
        ],
        onCancel: () => {
          activeModal = null;
          editor.selection.restore();
        }
      });

      activeModal = modal;

      // Bind logic
      const elModal = modal.modalElement;
      const inputFind = elModal.querySelector('#fr-find');
      const inputReplace = elModal.querySelector('#fr-replace');
      const cbMatchCase = elModal.querySelector('#fr-match-case');
      const cbAllWords = elModal.querySelector('#fr-all-words');

      const btnFind = elModal.querySelector('#fr-btn-find');
      const btnReplace = elModal.querySelector('#fr-btn-replace');
      const btnReplaceAll = elModal.querySelector('#fr-btn-replace-all');
      const btnNext = elModal.querySelector('#fr-btn-next');
      const btnPrev = elModal.querySelector('#fr-btn-prev');

      updateButtonsState = () => {
         const hasResults = results.length > 0;
         btnReplace.disabled = !hasResults;
         btnReplaceAll.disabled = !hasResults;
         btnNext.disabled = !hasResults;
         btnPrev.disabled = !hasResults;
      };

      executeSearch = () => {
         performSearch(inputFind.value, cbMatchCase.checked);
         if (results.length > 0) {
            currentIndex = 0;
            highlightResult(currentIndex, cbAllWords.checked);
         } else {
            currentIndex = -1;
            editor.selection.restore(); // Ensure caret doesn't get lost
            editor.selection.save();
         }
         updateButtonsState();
      };

      cbAllWords.addEventListener('change', () => {
         if (results.length > 0) {
            highlightResult(currentIndex, cbAllWords.checked);
         }
      });

      // Auto-trigger search if input is pre-filled
      if (inputFind.value) {
         executeSearch();
      }
  };

  editor.ui.registry.addButton('findreplace', {
    text: 'Find and Replace',
    onAction: openFindReplace
  });

  // Setup Keyboard Shortcut Ctrl+F / Cmd+F
  editor.editableArea.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isFind = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'f' && !e.shiftKey && !e.altKey;

    if (isFind) {
      e.preventDefault();
      openFindReplace();
    }
  });
}
