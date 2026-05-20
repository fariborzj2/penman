/**
 * HelpPlugin — opens a categorized help dialog that teaches the writer
 * keyboard shortcuts, Markdown auto-conversions, and short usage tips.
 *
 *   plugins:  [..., 'help']
 *   toolbar:  '... help ...'
 *
 * The dialog opens via the toolbar button or by pressing F1 while focused
 * inside the editor's editable area.
 */
import faStrings from './lang/fa.js';
import enStrings from './lang/en.js';
import icons from './icons/index.js';
import { escapeHtml } from '../../utils/html.js';
import { isMac, modKey } from '../../utils/platform.js';
import './help.css';

const VERSION = '0.1.0';
const LICENSE = 'MIT';

const MOD = modKey();

/**
 * Render a small key-cap like `<kbd>` group, e.g. ["Ctrl", "B"] -> `Ctrl + B`.
 */
function keyCap(parts) {
  return parts
    .map(p => `<kbd class="penman-help-kbd">${escapeHtml(p)}</kbd>`)
    .join('<span class="penman-help-kbd-plus">+</span>');
}

/**
 * Build the dialog body as a single HTML string. We render four sections
 * (Shortcuts, Markdown, Tips, About) as accessible <section> blocks so
 * screen readers announce headings cleanly.
 */
function buildHelpHtml(editor) {
  const t = (k) => editor.i18n.t(`plugins.help.${k}`);

  // Keyboard shortcuts table
  const shortcutRows = [
    { keys: [MOD, 'B'],                action: t('shortcuts.bold') },
    { keys: [MOD, 'I'],                action: t('shortcuts.italic') },
    { keys: [MOD, 'U'],                action: t('shortcuts.underline') },
    { keys: [MOD, 'Z'],                action: t('shortcuts.undo') },
    { keys: isMac() ? [MOD, 'Shift', 'Z'] : ['Ctrl', 'Y'], action: t('shortcuts.redo') },
    { keys: [MOD, 'F'],                action: t('shortcuts.findReplace') },
    { keys: ['Ctrl', 'Shift', 'S'],    action: t('shortcuts.sourceCode') },
    { keys: [MOD, 'Enter'],            action: t('shortcuts.breakout') },
    { keys: ['Tab'],                   action: t('shortcuts.indentList') },
    { keys: ['Shift', 'Tab'],          action: t('shortcuts.outdentList') },
    { keys: ['F1'],                    action: t('shortcuts.openHelp') }
  ];

  // Markdown auto-conversions
  const markdownRows = [
    { type: '# ',     desc: t('markdown.h1') },
    { type: '## ',    desc: t('markdown.h2') },
    { type: '### ',   desc: t('markdown.h3') },
    { type: '- ',     desc: t('markdown.bullet') },
    { type: '1. ',    desc: t('markdown.ordered') },
    { type: '> ',     desc: t('markdown.quote') },
    { type: '`code`', desc: t('markdown.code') },
    { type: '**...**',desc: t('markdown.bold') },
    { type: '*...*',  desc: t('markdown.italic') },
    { type: '---',    desc: t('markdown.hr') }
  ];

  const tipKeys = ['images', 'links', 'tables', 'direction', 'paste', 'autosave', 'fullscreen'];

  return `
    <div class="penman-help">

      <section class="penman-help-section">
        <h4 class="penman-help-section-title">${escapeHtml(t('sections.shortcuts'))}</h4>
        <table class="penman-help-table">
          <thead>
            <tr>
              <th class="penman-help-th-keys">${escapeHtml(t('columns.keys'))}</th>
              <th>${escapeHtml(t('columns.action'))}</th>
            </tr>
          </thead>
          <tbody>
            ${shortcutRows.map(r => `
              <tr>
                <td>${keyCap(r.keys)}</td>
                <td>${escapeHtml(r.action)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>

      <section class="penman-help-section">
        <h4 class="penman-help-section-title">${escapeHtml(t('sections.markdown'))}</h4>
        <table class="penman-help-table">
          <thead>
            <tr>
              <th class="penman-help-th-keys">${escapeHtml(t('columns.type'))}</th>
              <th>${escapeHtml(t('columns.description'))}</th>
            </tr>
          </thead>
          <tbody>
            ${markdownRows.map(r => `
              <tr>
                <td><code class="penman-help-code">${escapeHtml(r.type)}</code></td>
                <td>${escapeHtml(r.desc)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>

      <section class="penman-help-section">
        <h4 class="penman-help-section-title">${escapeHtml(t('sections.tips'))}</h4>
        <ul class="penman-help-tips">
          ${tipKeys.map(k => `<li>${escapeHtml(t(`tips.${k}`))}</li>`).join('')}
        </ul>
      </section>

      <section class="penman-help-section">
        <h4 class="penman-help-section-title">${escapeHtml(t('sections.about'))}</h4>
        <div class="penman-help-about">
          <div><strong>${escapeHtml(t('about.name'))}</strong></div>
          <div class="penman-help-about-desc">${escapeHtml(t('about.description'))}</div>
          <div class="penman-help-about-meta">
            <span>${escapeHtml(t('about.version'))}: ${escapeHtml(VERSION)}</span>
            <span>${escapeHtml(t('about.license'))}: ${escapeHtml(LICENSE)}</span>
          </div>
        </div>
      </section>

    </div>
  `;
}

export function setupHelpPlugin(editor) {
  // Register plugin-owned data (lang + icons).
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.help', { fa: faStrings, en: enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(icons);
  }

  function openHelp() {
    editor.ui.createFormModal({
      title: editor.i18n.t('plugins.help.title'),
      width: '720px',
      fields: [
        { type: 'html', html: buildHelpHtml(editor) }
      ],
      buttons: [
        {
          text: editor.i18n.t('ui.close'),
          classNames: 'penman-btn-primary',
          onClick: (_e, modal) => modal.close()
        }
      ]
    });
  }

  // Register command + toolbar button.
  editor.commands.register('OPEN_HELP', { execute: () => openHelp() });
  if (editor.ui && editor.ui.registry) {
    editor.ui.registry.addButton('help', {
      text: editor.i18n.t('plugins.help.buttonLabel'),
      ariaLabel: editor.i18n.t('plugins.help.buttonLabel'),
      onAction: openHelp
    });
  }

  // F1 keyboard shortcut. We listen on the editable area so it doesn't
  // hijack the global F1 (browser help) when focus is outside the editor.
  const helpKeyHandler = (e) => {
    if (e.key === 'F1' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      openHelp();
    }
  };
  if (editor.editableArea && typeof editor.editableArea.addEventListener === 'function') {
    editor.editableArea.addEventListener('keydown', helpKeyHandler);
  }
  editor.on('destroy', () => {
    if (editor.editableArea && typeof editor.editableArea.removeEventListener === 'function') {
      editor.editableArea.removeEventListener('keydown', helpKeyHandler);
    }
  });
}
