/**
 * ContentAuditPlugin — premium, rule-based content audit modal for Penman.
 *
 * Registers:
 *   - command:  CONTENT_AUDIT
 *   - button:   audit
 *
 * Usage:
 *   plugins: [..., 'audit']
 *   toolbar: '... audit ...'
 *
 * No AI, no network. All checks are deterministic and run in-browser.
 */

import { AuditEngine } from './AuditEngine.js';
import { defaultRules } from './rules.js';
import { AuditModal, AUDIT_ICONS } from './AuditModal.js';
import './audit.css';
import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';

let _styleInjected = false;

/**
 * Rule IDs related to the document-level H1 heading. These checks are useful
 * when the editor content *is* a full page; if the host application stores the
 * page title in a separate input (the common CMS pattern), the user can opt
 * out with `auditIgnoreH1: true` and these rules — plus the heading-skip
 * complaint about content that starts with H2 — are suppressed.
 */
const H1_RULE_IDS = ['seo-no-h1', 'seo-multiple-h1', 'seo-h1-too-long'];

export function setupContentAuditPlugin(editor) {
  // Register plugin-owned data (lang + icons). Self-contained: removing
  // this plugin removes its strings and icons cleanly.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.audit', { fa: __faStrings, en: __enStrings });
  }

  const opts = editor.options || {};
  const ignoreH1 = !!opts.auditIgnoreH1;
  const explicitDisabled = Array.isArray(opts.auditDisabledRules) ? opts.auditDisabledRules : [];
  const disabledSet = new Set([
    ...explicitDisabled,
    ...(ignoreH1 ? H1_RULE_IDS : []),
  ]);

  // Filter out disabled rules at plugin setup. Custom rules added later via
  // editor.audit.addRule(...) are always honoured.
  let activeRules = defaultRules.filter(r => !disabledSet.has(r.id));

  // When H1 is ignored, the heading-skip rule should treat the document as
  // starting at the FIRST heading present (whatever its level) rather than
  // expecting H1 → H2 → … Replace the rule with a tolerant variant.
  if (ignoreH1) {
    activeRules = activeRules.map(rule => {
      if (rule.id !== 'struct-heading-skip') return rule;
      return {
        ...rule,
        detect(ctx) {
          const issues = [];
          let prevLevel = 0;
          let started = false;
          for (const h of ctx.headings) {
            const level = parseInt(h.tagName.substring(1), 10);
            if (!started) {
              // Accept whatever level the content starts with as the baseline.
              prevLevel = level;
              started = true;
              continue;
            }
            if (level > prevLevel + 1) {
              issues.push({
                element: h,
                locKey: 'plugins.audit.loc.headingSkip',
                locParams: {
                  from: prevLevel,
                  to: level,
                  text: (h.textContent || '').trim().slice(0, 50) || '—',
                },
              });
            }
            prevLevel = level;
          }
          return issues;
        },
      };
    });
  }

  const engine = new AuditEngine(activeRules);

  // Expose the engine on the editor for external use / custom rules.
  editor.audit = {
    engine,
    /**
     * Run an audit and return the report without opening the modal.
     */
    analyze() { return engine.analyze(editor.editableArea); },
    /**
     * Register an additional rule at runtime.
     */
    addRule(rule) { engine.register(rule); },
    /**
     * Disable rules by id at runtime. Accepts a single id or an array.
     * Effective on the next analysis pass.
     */
    disableRules(ids) {
      const list = Array.isArray(ids) ? ids : [ids];
      engine.rules = engine.rules.filter(r => !list.includes(r.id));
    },
    /**
     * List the ids of currently active rules.
     */
    listRules() { return engine.rules.map(r => r.id); },
    /**
     * Open the audit modal.
     */
    open() { openAuditModal(editor, engine); },
  };

  editor.commands.register('CONTENT_AUDIT', {
    queryState: () => false,
    execute: () => openAuditModal(editor, engine),
  });

  editor.ui.registry.addButton('audit', {
    iconName: 'audit',
    icon: AUDIT_ICONS.audit,
    text: editor.i18n.t('plugins.audit.title'),
    ariaLabel: editor.i18n.t('plugins.audit.title'),
    onAction: () => openAuditModal(editor, engine),
  });
}

// Singleton-per-editor reference so re-clicking the toolbar button reuses the
// modal rather than opening multiple stacked ones.
const _instances = new WeakMap();

function openAuditModal(editor, engine) {
  if (!_styleInjected) {
    // CSS is imported via the bundler; if `import './audit.css'` was tree-shaken
    // in a custom build, lazy-fallback by appending a marker class so the
    // consumer can troubleshoot. (Vite handles CSS imports natively.)
    _styleInjected = true;
  }

  let existing = _instances.get(editor);
  if (existing && existing.modal) {
    // Already open — bring focus back to the modal element.
    try { existing.modal.modalElement.focus(); } catch (_) { /* noop */ }
    return existing;
  }

  const am = new AuditModal(editor, engine);
  am.open();
  _instances.set(editor, am);
  return am;
}

// Provide the named export the PluginManager expects.
export { setupContentAuditPlugin as default };
