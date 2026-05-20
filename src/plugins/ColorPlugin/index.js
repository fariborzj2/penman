import { ColorPicker } from '../../ui/ColorPicker.js';
import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';
import __icons from './icons/index.js';

export function setupColorPlugin(editor) {
  // Register plugin-owned data (lang + icons). Self-contained: removing
  // this plugin removes its strings and icons cleanly.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.color', { fa: __faStrings, en: __enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(__icons);
  }

  // --- Text Color ---
  editor.commands.register('SET_TEXT_COLOR', {
    queryState: (editor) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      let node = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

      if (node && node.nodeType === Node.ELEMENT_NODE) {
        const computedStyle = window.getComputedStyle(node);
        return computedStyle.color;
      }
      return false;
    },
    execute: (editor, hex) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      applyStyleToSelection(editor, 'color', hex);
    }
  });

  // --- Highlight Color ---
  editor.commands.register('SET_HIGHLIGHT_COLOR', {
    queryState: (editor) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      let node = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

      if (node && node.nodeType === Node.ELEMENT_NODE) {
        const computedStyle = window.getComputedStyle(node);
        return computedStyle.backgroundColor;
      }
      return false;
    },
    execute: (editor, hex) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      applyStyleToSelection(editor, 'background-color', hex);
    }
  });

  function applyStyleToSelection(editor, styleProp, value) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const isRemoving = !value || value === 'transparent' || value === 'remove';

    // Strategy similar to FontSizePlugin to prevent conflicts and ensure robust splitting

    // 1. Clean existing identical styles inside the selection so they don't block our new style
    const commonAncestor = range.commonAncestorContainer;
    const container = commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentNode : commonAncestor;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
       acceptNode: (node) => {
           if (node.tagName.toLowerCase() === 'span' && node.style.getPropertyValue(styleProp)) {
               if (sel.containsNode(node, true)) {
                   return NodeFilter.FILTER_ACCEPT;
               }
           }
           return NodeFilter.FILTER_SKIP;
       }
    });

    const spansToClean = [];
    let currentNode = walker.nextNode();
    while(currentNode) {
        spansToClean.push(currentNode);
        currentNode = walker.nextNode();
    }

    // Wrap the selected text natively using fontSize as a proxy
    document.execCommand('fontSize', false, '7');

    spansToClean.forEach(span => {
       span.style.removeProperty(styleProp);
       if (span.getAttribute('style') === '') {
           span.removeAttribute('style');
       }
    });

    const fontTags = editor.editableArea.querySelectorAll('font[size="7"]');
    fontTags.forEach(fontNode => {
        const newSpan = document.createElement('span');

        if (!isRemoving) {
            newSpan.style.setProperty(styleProp, value);
        }

        while(fontNode.firstChild) {
            newSpan.appendChild(fontNode.firstChild);
        }
        fontNode.parentNode.replaceChild(newSpan, fontNode);
    });

    // Also update container if selection completely matches a span container
    if (container.tagName && container.tagName.toLowerCase() === 'span' && container.style.getPropertyValue(styleProp)) {
       if (range.startContainer === container.firstChild && range.endContainer === container.lastChild) {
           if (isRemoving) {
               container.style.removeProperty(styleProp);
               if (container.getAttribute('style') === '') container.removeAttribute('style');
           } else {
               container.style.setProperty(styleProp, value);
           }
       }
    }

    // After applying styles, forcefully run the span merge algorithm to prevent deep nesting bugs
    // The editor uses a unified sanitizer which includes mergeNestedSpans.
    // However, invoking the whole sanitizer can be heavy. Let's just call the specific normalizer
    // or rely on CommandManager's normalizeDOM. We'll explicitly call the Sanitizer's span merge directly
    // since it is precisely designed for this.
    if (editor.sanitizer && typeof editor.sanitizer._mergeNestedSpans === 'function') {
        editor.sanitizer._mergeNestedSpans(editor.editableArea);
    }
  }

  // UI rendering logic
  //
  // The hex input has a delicate interaction with the editor's selection /
  // focus pipeline:
  //
  //   • Focusing the input necessarily moves focus out of the contenteditable
  //     and clears its visible selection. The marker-based saved selection
  //     (DOM <span> markers inserted on dropdown open) is the only reliable
  //     reference to where the user wants the color applied.
  //   • CommandManager.execute() restores those markers via
  //     editor.selection.restore(), which internally calls editor.focus().
  //     That steals focus from the input on every keystroke and would route
  //     subsequent keystrokes back into the editor.
  //   • CommandManager also wipes the markers as part of its restore cycle,
  //     so a second execCommand triggered by the next keystroke has nothing
  //     to restore from.
  //   • The DOM mutations performed by applyStyleToSelection (cleanup +
  //     execCommand('fontSize') + span merging) can move text nodes around,
  //     so a freshly created marker pair may sit in an unexpected location
  //     by the time the next call runs.
  //
  // To make this robust we keep an explicit JS Range alongside the marker
  // system. The range is captured when the dropdown opens, restored to
  // window.getSelection() right before each execCommand, and re-captured
  // after the command applies the color. Focus is returned to the input
  // (with its cursor position preserved) so the user can keep typing.
  const renderDropdownContent = (command) => {
    const container = document.createElement('div');
    container.className = 'penman-color-picker-container';

    let savedRange = null;

    const captureRange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const r = sel.getRangeAt(0);
      if (!editor.editableArea.contains(r.commonAncestorContainer)) return;
      savedRange = r.cloneRange();
    };

    // Expose the capture hook so the dropdown's onOpen handler can call it
    // while the user's original selection is still alive in the editor.
    container.__captureSelectionRange = captureRange;

    // Push the saved range back into the live window selection and refresh
    // the editor's marker system so CommandManager.execute() finds what it
    // expects. Returns true if the range was successfully restored.
    const restoreSavedRangeToEditor = () => {
      if (!savedRange) return false;
      try {
        editor.editableArea.focus();
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
        // Re-create markers from this range so the upcoming
        // selection.restore() inside CommandManager finds them.
        editor.selection.save();
        return true;
      } catch (_) {
        return false;
      }
    };

    const picker = new ColorPicker({
      onChange: (hex, final) => {
        const prevActive = document.activeElement;
        const isHexInput = !!(prevActive && prevActive.classList
          && prevActive.classList.contains('penman-color-picker-hex'));
        const inputSelStart = isHexInput && typeof prevActive.selectionStart === 'number'
          ? prevActive.selectionStart : null;
        const inputSelEnd = isHexInput && typeof prevActive.selectionEnd === 'number'
          ? prevActive.selectionEnd : null;

        // While typing in the hex input, force-restore the saved range so
        // execCommand reliably sees the original editor selection — even if
        // markers were lost or moved by a previous apply cycle.
        if (isHexInput) restoreSavedRangeToEditor();

        editor.execCommand(command, hex);

        // After the command, the selection is at the just-styled span.
        // Re-capture so the next keystroke applies to the same text.
        captureRange();

        if (final) {
          // Close the containing dropdown by walking up to the dropdown root
          // and calling its instance method, instead of synthesizing a body
          // click which could fire unrelated handlers across the page.
          const dropdownRoot = container.closest('.penman-dropdown');
          if (dropdownRoot && dropdownRoot.__dropdownInstance
              && typeof dropdownRoot.__dropdownInstance.close === 'function') {
            dropdownRoot.__dropdownInstance.close();
          }
          return;
        }

        if (isHexInput) {
          // Save markers from the new selection so the marker-based path
          // keeps working too, then hand focus back to the input.
          try { editor.selection.save(); } catch (_) { /* noop */ }
          try {
            prevActive.focus();
            if (inputSelStart != null && typeof prevActive.setSelectionRange === 'function') {
              prevActive.setSelectionRange(inputSelStart, inputSelEnd);
            }
          } catch (_) { /* noop */ }
        }
      }
    });

    container.appendChild(picker.getElement());
    return container;
  };

  // Capture both the marker-based selection AND an explicit JS Range when
  // the dropdown opens. The JS Range survives DOM mutations performed by
  // the color command and acts as the source of truth when markers go stale.
  const captureForDropdown = (dropdown) => {
    editor.selection.save();
    const container = dropdown && dropdown.panelElement
      ? dropdown.panelElement.querySelector('.penman-color-picker-container')
      : null;
    if (container && typeof container.__captureSelectionRange === 'function') {
      container.__captureSelectionRange();
    }
  };

  editor.ui.registry.addDropdown('textcolor', {
    text: editor.i18n.t('plugins.color.textColor'),
    icon: editor.ui.iconProvider.getIcon('textcolor') || '<span style="font-weight:bold;color:red;">A</span>',
    render: () => renderDropdownContent('SET_TEXT_COLOR'),
    onOpen: (dropdown) => captureForDropdown(dropdown),
    onClose: () => editor.selection.clearSaved()
  });

  editor.ui.registry.addDropdown('highlight', {
    text: editor.i18n.t('plugins.color.highlight'),
    icon: editor.ui.iconProvider.getIcon('highlight') || '<span style="background-color:yellow;">H</span>',
    render: () => renderDropdownContent('SET_HIGHLIGHT_COLOR'),
    onOpen: (dropdown) => captureForDropdown(dropdown),
    onClose: () => editor.selection.clearSaved()
  });
}
