export function setupFindReplacePlugin(editor) {
  let activeModal = null;

  class TextMapper {
    constructor(root) {
      this.root = root;
      this.text = '';
      this.mapping = [];
      this.build();
    }

    build() {
      this.text = '';
      this.mapping = [];
      const walker = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        const nodeText = node.nodeValue;
        this.mapping.push({
          node,
          globalOffset: this.text.length,
          length: nodeText.length
        });
        this.text += nodeText;
      }
    }

    getRangeForMatch(globalStart, matchLength) {
      let startNode = null;
      let startOffset = 0;
      let endNode = null;
      let endOffset = 0;

      let remaining = matchLength;
      let currentGlobal = globalStart;

      for (const map of this.mapping) {
        if (!startNode && currentGlobal >= map.globalOffset && currentGlobal < map.globalOffset + map.length) {
          startNode = map.node;
          startOffset = currentGlobal - map.globalOffset;
        }

        if (startNode && remaining > 0) {
           const nodeEnd = map.globalOffset + map.length;
           if (currentGlobal < nodeEnd) {
               const availableInNode = map.length - (currentGlobal - map.globalOffset);
               const consumed = Math.min(remaining, availableInNode);
               remaining -= consumed;
               currentGlobal += consumed;

               if (remaining === 0) {
                   endNode = map.node;
                   endOffset = currentGlobal - map.globalOffset;
                   break;
               }
           }
        }
      }

      if (startNode && endNode) {
         const range = document.createRange();
         try {
             range.setStart(startNode, startOffset);
             range.setEnd(endNode, endOffset);
             return range;
         } catch(e) {
             console.warn('Range creation failed', e);
         }
      }
      return null;
    }
  }

  const openFindReplace = () => {
    if (activeModal) return;

    let initialFindText = '';
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const text = sel.toString().trim();
        if (text && text.length < 150 && !text.includes('\n')) {
             initialFindText = text;
        }
    }

    editor.selection.save();

    let results = []; // Array of { globalStart, length }
    let currentIndex = -1;

    const performSearch = (query, matchCase) => {
        results = [];
        if (!query) return results;

        const mapper = new TextMapper(editor.editableArea);
        let textStr = mapper.text;
        let searchStr = query;

        if (!matchCase) {
             textStr = textStr.toLowerCase();
             searchStr = searchStr.toLowerCase();
        }

        let startIndex = 0;
        let index;
        while ((index = textStr.indexOf(searchStr, startIndex)) > -1) {
             results.push({ globalStart: index, length: query.length });
             startIndex = index + query.length;
        }
        return results;
    };

    const highlightResult = (index, selectAll = false) => {
         if (results.length === 0) return;

         const sel = window.getSelection();
         sel.removeAllRanges();
         const mapper = new TextMapper(editor.editableArea);

         if (selectAll) {
             // Browser selection API generally only supports 1 range visually in most modern browsers (except Firefox).
             // However, we'll try to add all ranges.
             results.forEach(res => {
                 const range = mapper.getRangeForMatch(res.globalStart, res.length);
                 if (range) {
                     sel.addRange(range);
                 }
             });

             if (results[0]) {
                 const firstRange = mapper.getRangeForMatch(results[0].globalStart, results[0].length);
                 if (firstRange && firstRange.startContainer.parentElement && firstRange.startContainer.parentElement.scrollIntoView) {
                     firstRange.startContainer.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }
             }
         } else {
             if (index < 0 || index >= results.length) return;
             const result = results[index];
             const range = mapper.getRangeForMatch(result.globalStart, result.length);

             if (range) {
                 sel.addRange(range);
                 if (range.startContainer.parentElement && range.startContainer.parentElement.scrollIntoView) {
                    range.startContainer.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }
             }
         }
    };

    const doReplaceAt = (index, replacement) => {
         if (index >= 0 && index < results.length) {
            const result = results[index];
            const mapper = new TextMapper(editor.editableArea);
            const range = mapper.getRangeForMatch(result.globalStart, result.length);

            if (range) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                editor.insertContent(replacement);
                return true;
            }
         }
         return false;
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
             highlightResult(currentIndex, elModal.querySelector('#fr-all-words').checked);
          }},
          { text: 'Previous', id: 'fr-btn-prev', align: 'left', disabled: true, onClick: () => {
             if (results.length === 0) return;
             currentIndex = (currentIndex - 1 + results.length) % results.length;
             highlightResult(currentIndex, elModal.querySelector('#fr-all-words').checked);
          }},
          { text: 'Find', id: 'fr-btn-find', classNames: 'penman-btn-primary', align: 'right', onClick: () => {
             editor.selection.restore();
             executeSearch();
          }},
          { text: 'Replace', id: 'fr-btn-replace', align: 'right', disabled: true, onClick: () => {
             if (results.length === 0) return;
             const replacement = elModal.querySelector('#fr-replace').value;
             if (doReplaceAt(currentIndex, replacement)) {
                 executeSearch();
             }
          }},
          { text: 'Replace all', id: 'fr-btn-replace-all', align: 'right', disabled: true, onClick: () => {
              if (results.length === 0) return;
              const replacement = elModal.querySelector('#fr-replace').value;

              if (editor.history && typeof editor.history.takeSnapshot === 'function') {
                  editor.history.takeSnapshot();
              }

              // Reverse iterate to maintain offsets
              for (let i = results.length - 1; i >= 0; i--) {
                  doReplaceAt(i, replacement);
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

    const elModal = modal.modalElement;

    const inputFind = elModal.querySelector('#fr-find');
    const inputReplace = elModal.querySelector('#fr-replace');
    const cbMatchCase = elModal.querySelector('#fr-match-case');
    const cbAllWords = elModal.querySelector('#fr-all-words');

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
            editor.selection.restore();
            editor.selection.save();
         }
         updateButtonsState();
    };

    cbAllWords.addEventListener('change', () => {
         if (results.length > 0) {
            highlightResult(currentIndex, cbAllWords.checked);
         }
    });

    if (inputFind.value) {
         executeSearch();
    }
  };

  editor.ui.registry.addButton('findreplace', {
    text: 'Find and Replace',
    onAction: openFindReplace
  });

  editor.editableArea.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isFind = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'f' && !e.shiftKey && !e.altKey;

    if (isFind) {
      e.preventDefault();
      openFindReplace();
    }
  });
}
