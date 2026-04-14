export function setupFindReplacePlugin(editor) {
  let activeModal = null;

  class TextMapper {
    constructor(root) {
      this.root = root;
      this.text = '';
      this.mapping = []; // Array of { node, globalOffset, length }
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

    // Binary search to find the mapping entry that contains the globalOffset in O(log N)
    // This is strictly required over Array.prototype.find() to prevent O(N*M) bottlenecks during "Replace All"
    findIndexForOffset(globalOffset) {
      let low = 0;
      let high = this.mapping.length - 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const map = this.mapping[mid];

        if (globalOffset >= map.globalOffset && globalOffset < map.globalOffset + map.length) {
          return mid;
        } else if (globalOffset < map.globalOffset) {
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
      return -1;
    }

    getRangeForMatch(globalStart, matchLength) {
      const startIndex = this.findIndexForOffset(globalStart);
      if (startIndex === -1) return null;

      let startNode = this.mapping[startIndex].node;
      let startOffset = globalStart - this.mapping[startIndex].globalOffset;

      let endNode = null;
      let endOffset = 0;

      let remaining = matchLength;
      let currentGlobal = globalStart;

      for (let i = startIndex; i < this.mapping.length; i++) {
         const map = this.mapping[i];
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
             // Highlighting 10,000 ranges crashes the browser or freezes JSDOM. Cap it at 100 for safety.
             const limit = Math.min(results.length, 100);
             for(let i=0; i<limit; i++) {
                 const res = results[i];
                 const range = mapper.getRangeForMatch(res.globalStart, res.length);
                 if (range) {
                     sel.addRange(range);
                 }
             }

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
             const elModal = modal.modalElement;
             highlightResult(currentIndex, elModal.querySelector('#fr-all-words').checked);
          }},
          { text: 'Previous', id: 'fr-btn-prev', align: 'left', disabled: true, onClick: () => {
             if (results.length === 0) return;
             currentIndex = (currentIndex - 1 + results.length) % results.length;
             const elModal = modal.modalElement;
             highlightResult(currentIndex, elModal.querySelector('#fr-all-words').checked);
          }},
          { text: 'Find', id: 'fr-btn-find', classNames: 'penman-btn-primary', align: 'right', onClick: () => {
             editor.selection.restore();
             executeSearch();
          }},
          { text: 'Replace', id: 'fr-btn-replace', align: 'right', disabled: true, onClick: () => {
             if (results.length === 0 || currentIndex < 0 || currentIndex >= results.length) return;
             const elModal = modal.modalElement;
             const replacement = elModal.querySelector('#fr-replace').value;

             const mapper = new TextMapper(editor.editableArea);
             const result = results[currentIndex];
             const range = mapper.getRangeForMatch(result.globalStart, result.length);

             if (range) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);

                // Use insertText instead of insertHTML to prevent XSS / format bleed
                document.execCommand('insertText', false, replacement);

                if (editor.history) {
                    editor.history.pushImmediate();
                }
                editor._syncToTextarea();
                editor.emit('change', editor.getContent());

                // Preserve sequential index UX rather than jumping to 0
                performSearch(elModal.querySelector('#fr-find').value, elModal.querySelector('#fr-match-case').checked);
                if (results.length > 0) {
                    // Match index logic: if we replaced the 2nd item, there's a new item at index 2 (formerly 3)
                    // Just bound it gracefully to array length.
                    currentIndex = Math.min(currentIndex, results.length - 1);
                    highlightResult(currentIndex, elModal.querySelector('#fr-all-words').checked);
                } else {
                    currentIndex = -1;
                    editor.selection.restore();
                    editor.selection.save();
                }
                updateButtonsState();
             }
          }},
          { text: 'Replace all', id: 'fr-btn-replace-all', align: 'right', disabled: true, onClick: () => {
              if (results.length === 0) return;
              const elModal = modal.modalElement;
              const replacement = elModal.querySelector('#fr-replace').value;

              if (editor.history && typeof editor.history.takeSnapshot === 'function') {
                  editor.history.takeSnapshot();
              }

              // We instantiate the TextMapper ONCE to achieve O(M + N log M)
              let mapper = new TextMapper(editor.editableArea);
              const sel = window.getSelection();

              // Iterate strictly backwards.
              // By mutating the DOM exclusively at indices greater than the remaining queue,
              // the structure and relative TextNode boundaries *before* the mutation point remain pristine.
              for (let i = results.length - 1; i >= 0; i--) {
                  const result = results[i];
                  const range = mapper.getRangeForMatch(result.globalStart, result.length);

                  if (range) {
                      if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
                          // Fast path: single text node string manipulation without triggering browser layout reflows/normalizations
                          const node = range.startContainer;
                          const text = node.nodeValue;
                          node.nodeValue = text.substring(0, range.startOffset) + replacement + text.substring(range.endOffset);
                      } else {
                          // Fallback path: multi-node boundaries. This uses execCommand which modifies multiple DOM nodes.
                          // It can cause previous text nodes (earlier in the array) to become detached if the browser normalizes.
                          // Since we iterate backwards, this is generally safe. However, to be absolutely bulletproof against
                          // unpredictable browser normalization of upstream siblings, we rebuild the mapper if we hit a complex boundary.
                          sel.removeAllRanges();
                          sel.addRange(range);
                          document.execCommand('insertText', false, replacement); // MUST be insertText to prevent XSS/HTML Injection

                          // Re-sync mapper to guarantee absolute safety for upstream nodes after heavy DOM mutation
                          if (i > 0) {
                              mapper = new TextMapper(editor.editableArea);
                          }
                      }
                  }
              }

              if (editor.history) {
                 editor.history.pushImmediate();
              }
              editor._syncToTextarea();
              editor.emit('change', editor.getContent());

              // After massive replace, don't execute search immediately if we replaced thousands,
              // or just clear results to avoid massive freeze on highlighting.
              results = [];
              currentIndex = -1;
              updateButtonsState();
              elModal.querySelector('#fr-find').focus();
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
