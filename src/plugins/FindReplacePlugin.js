export function setupFindReplacePlugin(editor) {
  editor.ui.registry.addButton('findreplace', {
    text: 'Find and Replace',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    onAction: () => {
      editor.selection.save();

      // State
      let results = [];
      let currentIndex = -1;
      let originalHtml = editor.getContent();

      // Find function
      const performSearch = (query, matchCase, wholeWord) => {
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
             let isMatch = true;
             if (wholeWord) {
                const charBefore = index > 0 ? text[index - 1] : ' ';
                const charAfter = index + query.length < text.length ? text[index + query.length] : ' ';
                const isWordBoundary = (c) => /[\s\.,!\?;:()\[\]"']/.test(c) || c === ' ' || c === '\u00A0';

                if (!isWordBoundary(charBefore) || !isWordBoundary(charAfter)) {
                   isMatch = false;
                }
             }

             if (isMatch) {
               results.push({ node, index, length: query.length });
             }
             startIndex = index + query.length;
           }
        });

        return results;
      };

      const highlightResult = (index) => {
         if (results.length === 0 || index < 0 || index >= results.length) return;

         const result = results[index];
         const range = document.createRange();
         range.setStart(result.node, result.index);
         range.setEnd(result.node, result.index + result.length);

         const sel = window.getSelection();
         sel.removeAllRanges();
         sel.addRange(range);

         // Scroll into view
         if (result.node.parentElement && typeof result.node.parentElement.scrollIntoView === 'function') {
            result.node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
          <input type="text" id="fr-find" placeholder="Find text...">
          <label for="fr-find">Find</label>
        </div>
        <div class="penman-modal-form-row">
          <input type="text" id="fr-replace" placeholder="Replace with...">
          <label for="fr-replace">Replace with</label>
        </div>
        <div class="penman-modal-checkbox-group">
          <label><input type="checkbox" id="fr-match-case"> Match case</label>
          <label><input type="checkbox" id="fr-whole-word"> Whole words</label>
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
             highlightResult(currentIndex);
          }},
          { text: 'Previous', id: 'fr-btn-prev', align: 'left', disabled: true, onClick: () => {
             if (results.length === 0) return;
             currentIndex = (currentIndex - 1 + results.length) % results.length;
             highlightResult(currentIndex);
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
             editor.history.takeSnapshot();
             for (let i = results.length - 1; i >= 0; i--) {
                 doReplaceAt(i, replacement);
             }
             executeSearch();
          }}
        ],
        onCancel: () => {
          editor.selection.restore();
        }
      });

      // Bind logic
      const elModal = modal.modalElement;
      const inputFind = elModal.querySelector('#fr-find');
      const inputReplace = elModal.querySelector('#fr-replace');
      const cbMatchCase = elModal.querySelector('#fr-match-case');
      const cbWholeWord = elModal.querySelector('#fr-whole-word');

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
         performSearch(inputFind.value, cbMatchCase.checked, cbWholeWord.checked);
         if (results.length > 0) {
            currentIndex = 0;
            highlightResult(currentIndex);
         } else {
            currentIndex = -1;
            editor.selection.restore(); // Ensure caret doesn't get lost
            editor.selection.save();
         }
         updateButtonsState();
      };
    }
  });
}
