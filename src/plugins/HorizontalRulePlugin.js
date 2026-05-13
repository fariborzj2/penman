export function setupHorizontalRulePlugin(editor) {
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

      if (blockNode) {
          // Split the current block at the caret and insert <hr> between the
          // halves. This replaces the deprecated
          // document.execCommand('insertHorizontalRule', ...) with explicit
          // DOM operations that produce the same result deterministically.
          const range = sel.getRangeAt(0);

          // 1. Move everything AFTER the caret into a fresh clone of the block
          //    so we can place the <hr> between the two halves.
          const afterFragment = range.cloneRange();
          afterFragment.setEnd(blockNode, blockNode.childNodes.length);
          afterFragment.setStart(range.endContainer, range.endOffset);
          const trailingFragment = afterFragment.extractContents();

          const trailingBlock = document.createElement(blockNode.tagName);
          trailingBlock.appendChild(trailingFragment);
          if (!trailingBlock.firstChild) {
            trailingBlock.appendChild(document.createElement('br'));
          }

          blockNode.parentNode.insertBefore(hr, blockNode.nextSibling);
          blockNode.parentNode.insertBefore(trailingBlock, hr.nextSibling);

          // 2. Move caret into the trailing block.
          const newRange = document.createRange();
          newRange.setStart(trailingBlock, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
      } else {
          // Fallback if not in block
          const range = sel.getRangeAt(0);
          range.insertNode(hr);
          range.setStartAfter(hr);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
      }

      // Ensure there is a paragraph after hr if it's the last element
      const lastChild = editor.editableArea.lastChild;
      if (lastChild && lastChild.tagName && lastChild.tagName.toLowerCase() === 'hr') {
          const p = document.createElement('p');
          editor.editableArea.appendChild(p);

          // move selection to new p
          sel.removeAllRanges();
          const newRange = document.createRange();
          newRange.setStart(p, 0);
          newRange.collapse(true);
          sel.addRange(newRange);
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
