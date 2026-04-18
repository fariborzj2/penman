export function setupFindReplacePlugin(editor) {
  let activeModal = null;

  class TextMapper {
    constructor(root, normalizeRTL = false) {
      this.root = root;
      this.normalizeRTL = normalizeRTL;
      this.text = '';
      this.mapping = [];
      this.build();
    }

    normalizeChar(char) {
      if (!this.normalizeRTL) return char;

      if (/[\u064B-\u065F\u0670]/.test(char)) return '';
      if (char === '\u0640') return '';
      if (char === '\u200C' || char === '\u200D') return '';

      if (char === 'ي') return 'ی';
      if (char === 'ك') return 'ک';

      if (char === 'أ' || char === 'إ' || char === 'آ') return 'ا';
      if (char === 'ة') return 'ه';

      return char;
    }

    normalizeString(str) {
      let res = '';
      for (let i = 0; i < str.length; i++) {
        res += this.normalizeChar(str[i]);
      }
      return res;
    }

    build() {
      this.text = '';
      this.mapping = [];
      const walker = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        const nodeText = node.nodeValue;
        for (let i = 0; i < nodeText.length; i++) {
          const char = nodeText[i];
          const normalized = this.normalizeChar(char);

          if (normalized.length > 0) {
            this.text += normalized;
            this.mapping.push({ node, offset: i });
          }
        }
      }
    }

    getRangeForMatch(globalStart, matchLength) {
      if (globalStart < 0 || globalStart >= this.mapping.length || matchLength <= 0) return null;

      const startMap = this.mapping[globalStart];
      const startNode = startMap.node;
      let startOffset = startMap.offset;

      const endGlobalIndex = globalStart + matchLength - 1;
      if (endGlobalIndex >= this.mapping.length) return null;

      const endMap = this.mapping[endGlobalIndex];
      const endNode = endMap.node;

      let endOffset = endMap.offset + 1;

      if (endGlobalIndex + 1 < this.mapping.length) {
        const nextMap = this.mapping[endGlobalIndex + 1];
        if (nextMap.node === endNode) {
          endOffset = nextMap.offset;
        } else {
          endOffset = endNode.nodeValue.length;
        }
      } else {
        endOffset = endNode.nodeValue.length;
      }

      if (startNode && endNode) {
        const range = document.createRange();
        try {
          startOffset = Math.min(startOffset, startNode.nodeValue.length);
          endOffset = Math.min(endOffset, endNode.nodeValue.length);
          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);
          return range;
        } catch (e) {
          console.warn('Range creation failed', e);
        }
      }
      return null;
    }

    resolveGlobalOffsetToNative(globalOffset) {
      if (this.mapping.length === 0) return null;
      if (globalOffset >= this.mapping.length) {
        const last = this.mapping[this.mapping.length - 1];
        return {
          node: last.node,
          offset: Math.min(last.node.nodeValue.length, globalOffset - last.globalOffset + last.offset)
        };
      }
      const map = this.mapping[globalOffset];
      return { node: map.node, offset: Math.min(map.node.nodeValue.length, map.offset) };
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

    let results = [];
    let currentIndex = -1;

    const performSearch = (query, matchCase, normalizeRTL) => {
      results = [];
      if (!query) return results;

      const mapper = new TextMapper(editor.editableArea, normalizeRTL);
      let textStr = mapper.text;
      let searchStr = normalizeRTL ? mapper.normalizeString(query) : query;

      if (!matchCase) {
        textStr = textStr.toLowerCase();
        searchStr = searchStr.toLowerCase();
      }

      let startIndex = 0;
      let index;
      while ((index = textStr.indexOf(searchStr, startIndex)) > -1) {
        results.push({ globalStart: index, length: searchStr.length });
        startIndex = index + searchStr.length;
      }
      return results;
    };

    const highlightResult = (index, selectAll = false, normalizeRTL = false) => {
      if (results.length === 0) return;

      const sel = window.getSelection();
      sel.removeAllRanges();
      const mapper = new TextMapper(editor.editableArea, normalizeRTL);

      if (selectAll) {
        const limit = Math.min(results.length, 100);
        for (let i = 0; i < limit; i++) {
          const res = results[i];
          const range = mapper.getRangeForMatch(res.globalStart, res.length);
          if (range) sel.addRange(range);
        }

        if (results[0]) {
          const firstRange = mapper.getRangeForMatch(results[0].globalStart, results[0].length);
          if (firstRange && firstRange.startContainer.parentElement &&
              firstRange.startContainer.parentElement.scrollIntoView) {
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

    const doReplaceAt = (index, replacement, normalizeRTL) => {
      if (index >= 0 && index < results.length) {
        const result = results[index];
        const mapper = new TextMapper(editor.editableArea, normalizeRTL);
        const range = mapper.getRangeForMatch(result.globalStart, result.length);

        if (range) {
          if (range.startContainer === range.endContainer &&
              range.startContainer.nodeType === Node.TEXT_NODE) {
            const node = range.startContainer;
            const text = node.nodeValue;
            node.nodeValue = text.substring(0, range.startOffset) + replacement + text.substring(range.endOffset);
            return true;
          } else {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            try {
              range.deleteContents();
              range.insertNode(document.createTextNode(replacement));
              return true;
            } catch (e) {
              console.warn('Find and Replace native DOM split failed', e);
            }
          }
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
          <label><input type="checkbox" id="fr-normalize-rtl" checked> Ignore Diacritics (RTL)</label>
          <label><input type="checkbox" id="fr-all-words"> All words</label>
        </div>
    `;

    let updateButtonsState;
    let executeSearch;

    const modal = editor.ui.createModal({
      title: 'Find and Replace',
      body: modalHtml,
      buttons: [
        {
          text: 'Next', id: 'fr-btn-next', align: 'left', disabled: true,
          onClick: () => {
            if (results.length === 0) return;
            currentIndex = (currentIndex + 1) % results.length;
            const elModal = modal.modalElement;
            highlightResult(currentIndex,
              elModal.querySelector('#fr-all-words').checked,
              elModal.querySelector('#fr-normalize-rtl').checked);
          }
        },
        {
          text: 'Previous', id: 'fr-btn-prev', align: 'left', disabled: true,
          onClick: () => {
            if (results.length === 0) return;
            currentIndex = (currentIndex - 1 + results.length) % results.length;
            const elModal = modal.modalElement;
            highlightResult(currentIndex,
              elModal.querySelector('#fr-all-words').checked,
              elModal.querySelector('#fr-normalize-rtl').checked);
          }
        },
        {
          text: 'Find', id: 'fr-btn-find', classNames: 'penman-btn-primary', align: 'right',
          onClick: () => {
            editor.selection.restore();
            executeSearch();
          }
        },
        {
          text: 'Replace', id: 'fr-btn-replace', align: 'right', disabled: true,
          onClick: () => {
            if (results.length === 0 || currentIndex < 0 || currentIndex >= results.length) return;
            const elModal = modal.modalElement;
            const replacement = elModal.querySelector('#fr-replace').value;
            const normalizeRTL = elModal.querySelector('#fr-normalize-rtl').checked;

            const currentResult = results[currentIndex];
            const originalStart = currentResult.globalStart;

            if (doReplaceAt(currentIndex, replacement, normalizeRTL)) {
              // FIX: pushImmediate replaces the non-existent takeSnapshot call
              if (editor.history) {
                editor.history.pushImmediate();
              }
              editor._syncToTextarea();
              editor.emit('change', editor.getContent());

              performSearch(
                elModal.querySelector('#fr-find').value,
                elModal.querySelector('#fr-match-case').checked,
                normalizeRTL
              );

              if (results.length > 0) {
                let nextIdx = results.findIndex(r => r.globalStart >= originalStart);
                if (nextIdx === -1) nextIdx = 0;
                currentIndex = nextIdx;
                highlightResult(currentIndex, elModal.querySelector('#fr-all-words').checked, normalizeRTL);
              } else {
                currentIndex = -1;
                const finalMapper = new TextMapper(editor.editableArea, normalizeRTL);
                const sel = window.getSelection();
                sel.removeAllRanges();
                const marker = finalMapper.resolveGlobalOffsetToNative(originalStart + replacement.length);
                if (marker) {
                  try {
                    const range = document.createRange();
                    range.setStart(marker.node, marker.offset);
                    range.collapse(true);
                    sel.addRange(range);
                  } catch (e) {}
                }
                editor.selection.save();
              }
              updateButtonsState();
            }
          }
        },
        {
          text: 'Replace all', id: 'fr-btn-replace-all', align: 'right', disabled: true,
          onClick: () => {
            if (results.length === 0) return;
            const elModal = modal.modalElement;
            const replacement = elModal.querySelector('#fr-replace').value;
            const normalizeRTL = elModal.querySelector('#fr-normalize-rtl').checked;

            // FIX: Use pushImmediate (takeSnapshot does not exist on HistoryManager)
            // Push a snapshot BEFORE the replacement to allow undo
            if (editor.history) {
              editor.history.pushImmediate();
            }

            let mapper = new TextMapper(editor.editableArea, normalizeRTL);

            for (let i = results.length - 1; i >= 0; i--) {
              const result = results[i];
              const range = mapper.getRangeForMatch(result.globalStart, result.length);

              if (range) {
                if (range.startContainer === range.endContainer &&
                    range.startContainer.nodeType === Node.TEXT_NODE) {
                  const node = range.startContainer;
                  const text = node.nodeValue;
                  node.nodeValue = text.substring(0, range.startOffset) +
                    replacement + text.substring(range.endOffset);
                } else {
                  try {
                    range.deleteContents();
                    range.insertNode(document.createTextNode(replacement));
                  } catch (e) {
                    console.warn('Find and Replace native DOM split failed', e);
                  }
                }
              }
            }

            // Push a second snapshot AFTER all replacements are complete
            if (editor.history) {
              editor.history.pushImmediate();
            }
            editor._syncToTextarea();
            editor.emit('change', editor.getContent());

            results = [];
            currentIndex = -1;
            updateButtonsState();
            elModal.querySelector('#fr-find').focus();
          }
        }
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
    const cbNormalizeRTL = elModal.querySelector('#fr-normalize-rtl');

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
      performSearch(inputFind.value, cbMatchCase.checked, cbNormalizeRTL.checked);
      if (results.length > 0) {
        currentIndex = 0;
        highlightResult(currentIndex, cbAllWords.checked, cbNormalizeRTL.checked);
      } else {
        currentIndex = -1;
        editor.selection.restore();
        editor.selection.save();
      }
      updateButtonsState();
    };

    cbAllWords.addEventListener('change', () => {
      if (results.length > 0) {
        highlightResult(currentIndex, cbAllWords.checked, cbNormalizeRTL.checked);
      }
    });

    cbNormalizeRTL.addEventListener('change', () => {
      executeSearch();
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
    const isFind = (isMac ? e.metaKey : e.ctrlKey) &&
      e.key.toLowerCase() === 'f' && !e.shiftKey && !e.altKey;

    if (isFind) {
      e.preventDefault();
      openFindReplace();
    }
  });
}
