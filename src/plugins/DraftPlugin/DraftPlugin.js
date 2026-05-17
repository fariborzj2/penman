import { logger } from '../../utils/logger.js';
/**
 * DraftPlugin
 * Auto-saves editor content to browser storage and shows a recovery
 * banner when a newer local draft exists than the loaded server content.
 *
 * Usage:
 *   penman.init({
 *     selector: '#editor',
 *     plugins: ['draft'],
 *     // Required:
 *     draftDocumentId: 'post-42',
 *     // Optional:
 *     draftServerContent: serverHtml,      // to compare with local draft
 *     draftServerTimestamp: 1710000000000, // ms since epoch of the server version
 *     draftDebounceDelay: 750,             // ms (default)
 *     draftTTL: 7 * 24 * 60 * 60 * 1000,  // ms (default 7 days)
 *     draftTitle: 'My Post',              // stored alongside content
 *     draftOnRestore: (draft) => { },     // called after user clicks Restore
 *     draftOnDiscard: (draft) => { },     // called after user clicks Discard
 *     draftOnSave: ({ content, documentId }) => { }, // called after each debounced save
 *   });
 *
 * Public API after init:
 *   editor.draft.clear()          → removes the stored draft (call after successful publish)
 *   editor.draft.save(title?)     → force-saves the current content immediately
 *   editor.draft.load()           → returns the stored draft object or null
 *   editor.draft.getDocumentId()  → returns the documentId being used
 *   editor.draft.getStorageKey()  → returns the full localStorage/IDB key
 */

import { DraftStorage } from './DraftStorage.js';
import { DraftManager } from './DraftManager.js';
import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';

const STYLE_ID = 'penman-draft-styles';

// ─── Style injection (idempotent) ─────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    .penman-draft-banner{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 14px;background:var(--color-background-info);border:1px solid var(--color-border-info);border-radius:8px;font-size:13px;color:var(--color-text-info);margin-bottom:8px;box-sizing:border-box;width:100%}
    .penman-draft-banner[dir="rtl"]{direction:rtl}
    .penman-draft-banner-msg{flex:1;line-height:1.5; flex-basis: 350px;}
    .penman-draft-banner-date{display:block;font-size:11px;opacity:.7;margin-top:3px}
    .penman-draft-banner-actions{display:flex;gap:8px;flex-shrink:0;padding-top:1px}
    .penman-draft-banner-actions button{font-family:inherit;font-size:12px;padding:8px 12px 6px;border-radius:4px;cursor:pointer;white-space:nowrap}
    .penman-draft-btn-restore{background:var(--color-background-info);color:var(--color-text-info);border:none}
    .penman-draft-btn-restore:hover{opacity:.85}
    .penman-draft-btn-discard{background:transparent;color:var(--color-text-secondary);border:1px solid var(--color-border-secondary)}
    .penman-draft-btn-discard:hover{background:var(--color-background-secondary)}
    .penman-draft-status{font-size:11px;color:var(--color-text-secondary);padding:0 4px;flex-shrink:0}
    .penman-draft-status.pds-saving{color:var(--color-text-info)}
    .penman-draft-status.pds-saved{color:var(--color-text-success)}
  `;
  document.head.appendChild(el);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(ts, lang) {
  try {
    return new Intl.DateTimeFormat(lang, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

// ─── Plugin setup ─────────────────────────────────────────────────────────────

export function setupDraftPlugin(editor) {
  // Register plugin-owned data (lang + icons). Self-contained: removing
  // this plugin removes its strings and icons cleanly.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.draft', { fa: __faStrings, en: __enStrings });
  }

  // ── Guard: verify editor API ──────────────────────────────────────────────
  if (
    !editor ||
    typeof editor.on !== 'function' ||
    typeof editor.getContent !== 'function' ||
    typeof editor.setContent !== 'function'
  ) {
    logger.warn('[DraftPlugin] Incompatible editor instance. Plugin not loaded.');
    return;
  }

  // ── Resolve documentId ────────────────────────────────────────────────────
  const documentId =
    editor.options.draftDocumentId ||
    editor.options.documentId ||
    (editor.textarea && editor.textarea.id ? editor.textarea.id : null) ||
    (editor.textarea && editor.textarea.name ? editor.textarea.name : null);

  if (!documentId) {
    logger.warn(
      '[DraftPlugin] No documentId could be determined. ' +
      'Pass one via editor.options.draftDocumentId.'
    );
    return;
  }

  // ── Read config ───────────────────────────────────────────────────────────
  const cfg = {
    debounceDelay: editor.options.draftDebounceDelay ?? 750,
    ttl:           editor.options.draftTTL,
    serverContent: editor.options.draftServerContent  ?? null,
    serverTs:      editor.options.draftServerTimestamp ?? 0,
    onRestore:     editor.options.draftOnRestore  ?? null,
    onDiscard:     editor.options.draftOnDiscard  ?? null,
    onSave:        editor.options.draftOnSave     ?? null,
    getTitle:      editor.options.draftGetTitle   ?? (() => editor.options.draftTitle || ''),
  };

  injectStyles();

  const storage = new DraftStorage();
  const manager = new DraftManager(storage, documentId, {
    ttl:           cfg.ttl,
    debounceDelay: cfg.debounceDelay,
  });

  // Seed the diff-check baseline so the first identical `change` event
  // doesn't trigger an unnecessary write.
  manager.seedBaseContent(editor.getContent());

  // ── Status bar ────────────────────────────────────────────────────────────
  //
  // The status DOM element is updated *via a state machine*, not on every
  // keystroke. We track the current displayed state in `statusState` and
  // only touch the DOM when that state actually changes. This is the
  // single biggest reason the previous implementation felt laggy: it was
  // rewriting textContent + className on every input event, which forces
  // style recalc/paint on each character.
  let statusEl    = null;
  let statusTimer = null;
  let statusState = 'idle'; // 'idle' | 'saving' | 'saved'

  // i18n strings — read once at setup, refreshed lazily if language changes.
  // i18n.t() can return the key itself when missing; we keep a safe fallback.
  function t(key, fallback) {
    if (!editor.i18n) return fallback;
    const v = editor.i18n.t(key);
    return v && v !== key ? v : fallback;
  }
  let labels = {
    saving:    t('plugins.draft.saving',     'Saving…'),
    saved:     t('plugins.draft.draftSaved', 'Draft saved'),
    restored:  t('plugins.draft.draftRestored', 'Draft restored'),
    discarded: t('plugins.draft.draftDiscarded', 'Draft discarded')
  };

  function mountStatusBar() {
    if (!editor.footer) return;
    statusEl = document.createElement('span');
    statusEl.className = 'penman-draft-status';
    editor.footer.appendChild(statusEl);
  }

  // Render the current status into the DOM. Pure: no-op if nothing changed,
  // so it's cheap to call repeatedly. autoHideMs schedules a transition back
  // to 'idle' after the given delay (used for transient "saved" toasts).
  function renderStatus(nextState, autoHideMs = 0) {
    if (!statusEl) return;
    if (statusState === nextState) return; // skip DOM write — same state
    statusState = nextState;

    if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }

    if (nextState === 'saving') {
      statusEl.textContent = labels.saving;
      statusEl.className = 'penman-draft-status pds-saving';
    } else if (nextState === 'saved') {
      statusEl.textContent = labels.saved;
      statusEl.className = 'penman-draft-status pds-saved';
    } else { // idle
      statusEl.textContent = '';
      statusEl.className = 'penman-draft-status';
    }

    if (autoHideMs > 0) {
      statusTimer = setTimeout(() => {
        statusTimer = null;
        renderStatus('idle');
      }, autoHideMs);
    }
  }

  // Convenience for one-shot toast messages (used by recovery/discard flow,
  // which doesn't fit the saving/saved state machine).
  function flashMessage(text, cssClass = '', autoHideMs = 4000) {
    if (!statusEl) return;
    statusState = 'flash';
    if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
    statusEl.textContent = text;
    statusEl.className = `penman-draft-status${cssClass ? ` ${cssClass}` : ''}`;
    if (autoHideMs > 0) {
      statusTimer = setTimeout(() => {
        statusTimer = null;
        renderStatus('idle');
      }, autoHideMs);
    }
  }

  // ── Recovery banner ───────────────────────────────────────────────────────

  let bannerEl = null;

  function removeBanner() {
    if (bannerEl && bannerEl.parentNode) {
      bannerEl.parentNode.removeChild(bannerEl);
    }
    bannerEl = null;
  }

  function showRecoveryBanner(draft) {
    if (!editor.container || !editor.container.parentNode) return;
    removeBanner();

    bannerEl = document.createElement('div');
    bannerEl.id = `penman-draft-recovery-banner-${documentId}`;
    bannerEl.className = 'penman-draft-banner';
    const resolvedDir = editor.options.direction === 'auto' ? editor.i18n.dir : editor.options.direction;
    bannerEl.setAttribute('dir', resolvedDir);
    bannerEl.setAttribute('role', 'alert');
    bannerEl.setAttribute('aria-live', 'polite');

    const msg = document.createElement('div');
    msg.className = 'penman-draft-banner-msg';
    msg.textContent = editor.i18n.t('plugins.draft.recoveryBannerMsg');

    const dateNote = document.createElement('span');
    dateNote.className = 'penman-draft-banner-date';
    dateNote.textContent = editor.i18n.t('plugins.draft.lastAutoSaved') + formatDateTime(draft.lastSavedAt, editor.i18n.lang);
    msg.appendChild(dateNote);

    const actions = document.createElement('div');
    actions.className = 'penman-draft-banner-actions';

    const restoreBtn = document.createElement('button');
    restoreBtn.type = 'button';
    restoreBtn.className = 'penman-draft-btn-restore';
    restoreBtn.textContent = editor.i18n.t('plugins.draft.restoreDraft');

    const discardBtn = document.createElement('button');
    discardBtn.type = 'button';
    discardBtn.className = 'penman-draft-btn-discard';
    discardBtn.textContent = editor.i18n.t('plugins.draft.discard');

    actions.appendChild(restoreBtn);
    actions.appendChild(discardBtn);
    bannerEl.appendChild(msg);
    bannerEl.appendChild(actions);

    // Insert the banner immediately above the editor wrapper
    editor.container.parentNode.insertBefore(bannerEl, editor.container);

    restoreBtn.addEventListener('click', async () => {
      editor.setContent(draft.content);
      if (editor.history) editor.history.pushImmediate();
      manager.seedBaseContent(draft.content);
      removeBanner();
      flashMessage(labels.restored, 'pds-saved');
      if (typeof cfg.onRestore === 'function') cfg.onRestore(draft);
    });

    discardBtn.addEventListener('click', async () => {
      await manager.remove();
      manager.seedBaseContent(editor.getContent());
      removeBanner();
      flashMessage(labels.discarded);
      if (typeof cfg.onDiscard === 'function') cfg.onDiscard(draft);
    });
  }

  // ── Startup: check for a recoverable draft ────────────────────────────────

  async function checkForExistingDraft() {
    const draft = await manager.load();
    if (!draft) return;

    // Determine the "server-rendered initial" state for comparison. We use
    // textarea.defaultValue (the value baked into the original HTML) rather
    // than textarea.value or editor.getContent(): both of those can be
    // polluted by the browser's form auto-recovery on F5, which restores the
    // textarea to whatever the user last typed. Comparing against the
    // polluted value would silently treat the recovered text as "the
    // server's version", make draft.content match it, and skip the banner —
    // which is exactly the bug users hit: storage clearly contains a draft
    // but the recovery UI never appears on reload.
    const rawInitial = (editor.textarea && editor.textarea.defaultValue) || '';
    const serverInitial = rawInitial.trim() || '<p></p>';

    // Draft is byte-for-byte identical to what the server originally sent
    // down → there's nothing to recover. Note we deliberately don't fall
    // back to comparing against the current editor content; see comment
    // above.
    if (draft.content === serverInitial) {
      manager.seedBaseContent(editor.getContent());
      return;
    }

    // Server content comparison — if a server version was provided, skip
    // recovery when the server version is at least as recent as the draft.
    if (cfg.serverContent !== null && typeof draft.lastSavedAt === 'number') {
      if (draft.lastSavedAt <= cfg.serverTs) {
        await manager.remove();
        return;
      }
    }

    // Show recovery UI — do NOT auto-restore.
    showRecoveryBanner(draft);
  }

  // ── Auto-save on content change ───────────────────────────────────────────
  //
  // Performance contract: this handler runs on every `change` (i.e. every
  // input event). It MUST stay cheap. Everything that's non-trivial — DOM
  // writes, i18n lookups, getContent() — moves out of the hot path:
  //
  //   • Status DOM is touched at most twice per save cycle (saving → saved),
  //     not once per keystroke.
  //   • The latest content reference is kept in a closure variable so we
  //     don't need to read it again at save-time.
  //   • The "saved" transition fires from a single trailing timer that we
  //     don't reset on every keystroke — only when typing actually pauses.
  //
  // The DraftManager already debounces writes; we just trust it.
  let latestContent      = null;
  let latestTitle        = '';
  let savedToastTimer    = null;  // schedules the "saved" toast after debounce
  let pendingSavedEmit   = false; // gate the onSave callback to once per cycle

  function onEditorChange(content) {
    // Cheap guard — avoid full string trim. `content` is the editor's
    // innerHTML; empty editors emit '<p><br></p>' which is truthy but
    // semantically empty. The DraftManager handles its own min-length
    // check, so we only short-circuit on falsy/blank to skip needless work.
    if (!content) return;

    latestContent = content;
    // getTitle() may do its own DOM work; users supplying a heavy callback
    // shouldn't pay for it on every keystroke either. We snapshot lazily
    // (once per "saving" state entry) to keep the hot path trivial.
    if (statusState !== 'saving') {
      latestTitle = cfg.getTitle();
      renderStatus('saving');
      pendingSavedEmit = true;
    }

    // Schedule the actual storage write. DraftManager debounces internally,
    // so this is just a timer reset — O(1).
    manager.scheduleSave(latestContent, latestTitle);

    // Schedule the "saved" toast / onSave callback exactly once per pause.
    // Resetting this timer on every keystroke is cheap (clear+set), and the
    // toast only ever paints when typing actually stops for `debounceDelay`.
    if (savedToastTimer) clearTimeout(savedToastTimer);
    savedToastTimer = setTimeout(() => {
      savedToastTimer = null;
      renderStatus('saved', 4000);
      if (pendingSavedEmit && typeof cfg.onSave === 'function') {
        pendingSavedEmit = false;
        // Use latestContent (already in hand) instead of calling
        // editor.getContent(), which clones the whole subtree.
        cfg.onSave({ content: latestContent, documentId });
      }
    }, cfg.debounceDelay + 100);
  }

  editor.on('change', onEditorChange);

  // ── Cleanup on editor destroy ─────────────────────────────────────────────

  editor.on('destroy', () => {
    manager.destroy();
    removeBanner();
    if (statusTimer)     { clearTimeout(statusTimer);     statusTimer = null; }
    if (savedToastTimer) { clearTimeout(savedToastTimer); savedToastTimer = null; }
    if (statusEl && statusEl.parentNode) statusEl.parentNode.removeChild(statusEl);
  });

  // ── Public API exposed on editor.draft ───────────────────────────────────

  editor.draft = {
    /**
     * Remove the stored draft. Call this after a successful server save /
     * publish so the recovery banner never shows stale data.
     * @returns {Promise<boolean>}
     */
    clear: () => manager.remove(),

    /**
     * Force an immediate save of the current editor content.
     * @param {string} [title]
     * @returns {Promise<boolean>}
     */
    save: (title) => manager.save(editor.getContent(), title ?? cfg.getTitle()),

    /**
     * Read the stored draft without side effects.
     * @returns {Promise<Object|null>}
     */
    load: () => manager.load(),

    /** @returns {string} */
    getDocumentId: () => documentId,

    /** @returns {string} The full storage key used (e.g. "penman:draft:post-42") */
    getStorageKey: () => manager.storageKey,
  };

  // ── Run initialisation after the current tick so the editor is fully ready
  mountStatusBar();
  setTimeout(checkForExistingDraft, 0);
}
