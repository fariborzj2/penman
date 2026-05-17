import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';
import __icons from './icons/index.js';

export function setupHorizontalRulePlugin(editor) {
  // Register plugin-owned data (lang + icons). Self-contained: removing
  // this plugin removes its strings and icons cleanly.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.hr', { fa: __faStrings, en: __enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(__icons);
  }

  editor.commands.register('INSERT_HORIZONTAL_RULE', {
    queryState: () => false,
    execute: (editor) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const hr = document.createElement('hr');

      // execCommand insertHorizontalRule is available but its block splitting behavior varies.
      // Better to insert it manually.

      let node = sel.anchorNode;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

      // Find closest block element
      let blockNode = null;
      let curr = node;
      while (curr && curr !== editor.editableArea) {
        const tagName = curr.tagName ? curr.tagName.toLowerCase() : '';
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].includes(tagName)) {
          blockNode = curr;
          break;
        }
        curr = curr.parentNode;
      }

      // Helper: decide if a DocumentFragment has user-meaningful content.
      // A lone propping <br> is structural, not content — we don't want
      // to split a block at the very end just to preserve an empty BR.
      const fragmentHasContent = (frag) => {
        if (!frag) return false;
        if (frag.textContent && frag.textContent.trim().length > 0) return true;
        for (const child of frag.childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
            return true;
          }
        }
        return false;
      };

      if (blockNode) {
          // Extract everything that comes after the caret within this block.
          // If it's non-empty, we split the block and place <hr> between the
          // halves. If it's empty (caret was at end of block), we just drop
          // the <hr> after the block — no empty trailing paragraph.
          const range = sel.getRangeAt(0);

          const afterFragment = range.cloneRange();
          afterFragment.setEnd(blockNode, blockNode.childNodes.length);
          afterFragment.setStart(range.endContainer, range.endOffset);
          const trailingFragment = afterFragment.extractContents();

          blockNode.parentNode.insertBefore(hr, blockNode.nextSibling);

          if (fragmentHasContent(trailingFragment)) {
              // Real content after the caret → keep it in a trailing block.
              const trailingBlock = document.createElement(blockNode.tagName);
              trailingBlock.appendChild(trailingFragment);
              blockNode.parentNode.insertBefore(trailingBlock, hr.nextSibling);

              const newRange = document.createRange();
              newRange.setStart(trailingBlock, 0);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
          } else {
              // Caret was at the end of the block. Position cursor after the
              // <hr> in whatever comes next — an existing sibling if one is
              // there, otherwise a fresh empty <p> so the user isn't stuck
              // with the caret pinned against a non-editable <hr>.
              const nextEl = hr.nextElementSibling;
              if (nextEl) {
                  const newRange = document.createRange();
                  newRange.setStart(nextEl, 0);
                  newRange.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(newRange);
              } else {
                  const p = document.createElement('p');
                  // Propping BR — without it the empty <p> has zero height
                  // and the cursor visually appears stuck on the line above.
                  p.innerHTML = '<br>';
                  hr.parentNode.appendChild(p);

                  const newRange = document.createRange();
                  newRange.setStart(p, 0);
                  newRange.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(newRange);
              }
          }
      } else {
          // Fallback if not inside a recognised block container. Insert the
          // <hr> at the caret and only add a paragraph if the <hr> ended up
          // as the last child of the editable area (otherwise the cursor
          // has nowhere to land).
          const range = sel.getRangeAt(0);
          range.insertNode(hr);

          if (hr === editor.editableArea.lastChild) {
              const p = document.createElement('p');
              p.innerHTML = '<br>';
              editor.editableArea.appendChild(p);
              const newRange = document.createRange();
              newRange.setStart(p, 0);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
          } else {
              range.setStartAfter(hr);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
          }
      }
    }
  });

  editor.ui.registry.addButton('hr', {
    text: editor.i18n.t('plugins.hr.title'),

    onAction: () => {
      editor.execCommand('INSERT_HORIZONTAL_RULE');
    }
  });
}
