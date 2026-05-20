// src/plugins/WordImportPlugin/WordImportPlugin.js
//
// Registers the "Import from Word" toolbar button and wires it to the
// ImportModal. Self-contained: registers its own i18n strings, icons, and
// CSS, so removing this plugin removes everything cleanly.

import { ImportModal } from './ui/ImportModal.js';
import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';
import __icons from './icons/index.js';
import './wordimport.css';

export function setupWordImportPlugin(editor) {
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.wordImport', { fa: __faStrings, en: __enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(__icons);
  }

  // Programmatic API — useful for hosts that want to trigger the dialog
  // from outside the toolbar (e.g. a custom drag-drop drop on the page).
  editor.wordImport = {
    open: () => {
      const modal = new ImportModal(editor);
      modal.open();
      return modal;
    },
  };

  if (editor.ui && editor.ui.registry) {
    editor.ui.registry.addButton('wordimport', {
      text: editor.i18n.t('plugins.wordImport.title'),
      onAction: () => editor.wordImport.open(),
    });
  }
}
