import faStrings from './lang/fa.js';
import enStrings from './lang/en.js';
import icons from './icons/index.js';

import { escapeHtmlAttr, safeUrl } from '../../utils/html.js';

export function setupLinkPlugin(editor) {
  // Register plugin-owned i18n strings and icons. After this call the editor
  // resolves "plugins.link.*" keys and the "link"/"unlink" icons normally.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.link', { fa: faStrings, en: enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(icons);
  }

  editor.commands.register('REMOVE_LINK', {
    queryState: (editor) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;

      let node = sel.getRangeAt(0).startContainer;
      while (node && node !== editor.editableArea) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'a') {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    },
    execute: (editor) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);

      // Native unlink: walk every <a> ancestor or descendant inside the
      // selection and unwrap it. Replaces document.execCommand('unlink')
      // and handles both collapsed-inside-link and non-collapsed cases
      // uniformly.
      const linksToRemove = new Set();

      // Case A: ancestors of either endpoint.
      const collectAncestorLinks = (node) => {
        let curr = node;
        while (curr && curr !== editor.editableArea) {
          if (curr.nodeType === Node.ELEMENT_NODE && curr.tagName.toLowerCase() === 'a') {
            linksToRemove.add(curr);
          }
          curr = curr.parentNode;
        }
      };
      collectAncestorLinks(range.startContainer);
      collectAncestorLinks(range.endContainer);

      // Case B: descendants of the common ancestor that intersect the range.
      if (!range.collapsed) {
        const common = range.commonAncestorContainer;
        const container = common.nodeType === Node.TEXT_NODE ? common.parentNode : common;
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
          acceptNode: (node) => {
            if (node.tagName && node.tagName.toLowerCase() === 'a') {
              return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        });
        let n;
        while ((n = walker.nextNode())) linksToRemove.add(n);
      }

      linksToRemove.forEach(linkNode => {
        const parent = linkNode.parentNode;
        if (!parent) return;
        while (linkNode.firstChild) {
          parent.insertBefore(linkNode.firstChild, linkNode);
        }
        parent.removeChild(linkNode);
      });
    }
  });

  editor.ui.registry.addButton('unlink', {
    text: editor.i18n.t('plugins.link.unlink'),
    onAction: () => {
      editor.execCommand('REMOVE_LINK');
    }
  });

  editor.ui.registry.addButton('link', {
    text: editor.i18n.t('plugins.link.insert'),
    onAction: function() {
      // Get the currently selected text before saving markers
      const sel = editor.selection.getSelection();
      let currentText = '';
      if (sel && sel.rangeCount > 0) {
        currentText = sel.toString();
      }

      const preSelectedNode = editor.selection.getSelectedNode();

      // Check if we are inside an existing link to edit it
      let existingLink = null;
      if (preSelectedNode && preSelectedNode.parentNode && preSelectedNode.parentNode.tagName === 'A') {
        existingLink = preSelectedNode.parentNode;
      } else if (sel && sel.rangeCount > 0) {
        let node = sel.getRangeAt(0).startContainer;
        while (node && node !== editor.editableArea) {
          if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'a') {
            existingLink = node;
            break;
          }
          node = node.parentNode;
        }
      }

      const initialData = {
        url: existingLink ? existingLink.getAttribute('href') || '' : '',
        text: existingLink ? existingLink.textContent : currentText,
        target: existingLink ? existingLink.getAttribute('target') || '' : '_blank',
        rel: existingLink ? existingLink.getAttribute('rel') || '' : 'noopener'
      };

      // Save current selection before opening the modal so we know where to insert
      editor.selection.save();

      editor.ui.createFormModal({
        title: editor.i18n.t('plugins.link.insert'),
        fields: [
          {
            type: 'url', name: 'url',
            label: editor.i18n.t('plugins.link.urlLabel'),
            placeholder: editor.i18n.t('plugins.link.urlPlaceholder'),
            value: initialData.url, required: true, dir: 'ltr'
          },
          {
            type: 'text', name: 'text',
            label: editor.i18n.t('plugins.link.textLabel'),
            placeholder: editor.i18n.t('plugins.link.textPlaceholder'),
            value: initialData.text
          },
          {
            type: 'row',
            fields: [
              {
                type: 'select', name: 'target',
                label: editor.i18n.t('plugins.link.targetLabel'),
                value: initialData.target,
                options: [
                  { value: '',        label: editor.i18n.t('plugins.link.targetNone') },
                  { value: '_blank',  label: editor.i18n.t('plugins.link.targetBlank') },
                  { value: '_self',   label: editor.i18n.t('plugins.link.targetSelf') },
                  { value: '_parent', label: editor.i18n.t('plugins.link.targetParent') },
                  { value: '_top',    label: editor.i18n.t('plugins.link.targetTop') }
                ]
              },
              {
                type: 'text', name: 'rel',
                label: editor.i18n.t('plugins.link.relLabel'),
                placeholder: editor.i18n.t('plugins.link.relPlaceholder'),
                value: initialData.rel, dir: 'ltr'
              }
            ]
          }
        ],
        onSubmit: (data) => {
          // Restore selection to the saved position
          editor.selection.restore();

          if (data.url) {
            // Reject javascript:/vbscript:/data: URLs before touching the DOM.
            const validatedUrl = safeUrl(data.url);
            if (!validatedUrl) {
              // Silently ignore unsafe URLs (could log via logger if available).
              return;
            }
            const hrefAttr = escapeHtmlAttr(validatedUrl);
            const safeText = data.text ? escapeHtmlAttr(data.text) : hrefAttr;
            const targetAttr = data.target ? ` target="${escapeHtmlAttr(data.target)}"` : '';
            const relAttr = data.rel ? ` rel="${escapeHtmlAttr(data.rel)}"` : '';

            if (existingLink) {
              existingLink.setAttribute('href', validatedUrl);
              if (data.target) existingLink.setAttribute('target', data.target);
              else existingLink.removeAttribute('target');

              if (data.rel) existingLink.setAttribute('rel', data.rel);
              else existingLink.removeAttribute('rel');

              // If it's a text link, update text content. If it contains a widget, don't overwrite it with text
              if (!preSelectedNode) {
                existingLink.innerText = data.text;
              }

              editor.history.pushImmediate();
              editor.emit('change', editor.getContent());
            } else if (preSelectedNode) {
               // Wrap the selected node (e.g., an image figure) in the anchor tag instead of text
               const a = document.createElement('a');
               a.setAttribute('href', validatedUrl);
               if (data.target) a.setAttribute('target', data.target);
               if (data.rel) a.setAttribute('rel', data.rel);

               a.appendChild(preSelectedNode.cloneNode(true));
               preSelectedNode.parentNode.replaceChild(a, preSelectedNode);

               editor.selection.clearNodeSelection();
               editor.history.pushImmediate();
               editor.emit('change', editor.getContent());
            } else {
               // Normal text insertion
               editor.insertContent(`<a href="${hrefAttr}"${targetAttr}${relAttr}>${safeText}</a>`);
            }
          }
        },
        onCancel: () => {
          // Always restore selection if cancelled so hidden markers are cleaned up
          editor.selection.restore();
        }
      });
    }
  });
}
