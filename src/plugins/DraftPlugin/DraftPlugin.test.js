/**
 * @vitest-environment jsdom
 *
 * Test suite for the DraftPlugin system.
 * Covers: DraftStorage, DraftManager, and DraftPlugin integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DraftStorage } from './DraftStorage.js';
import { DraftManager } from './DraftManager.js';
import { setupDraftPlugin } from './DraftPlugin.js';
import { Editor } from '../../core/Editor.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeEditor(extraOptions = {}) {
  document.body.innerHTML = '<textarea id="editor"></textarea>';
  return new Editor({
    selector: '#editor',
    draftDocumentId: 'test-doc-1',
    ...extraOptions,
  });
}

// ─── DraftStorage ─────────────────────────────────────────────────────────────

describe('DraftStorage', () => {
  let storage;

  beforeEach(() => {
    localStorage.clear();
    storage = new DraftStorage();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns null for missing key', async () => {
    const result = await storage.get('penman:draft:nonexistent');
    expect(result).toBeNull();
  });

  it('round-trips a small payload via localStorage', async () => {
    const payload = { content: '<p>Hello</p>', lastSavedAt: Date.now(), documentId: 'test' };
    const ok = await storage.set('penman:draft:test', payload);
    expect(ok).toBe(true);

    const loaded = await storage.get('penman:draft:test');
    expect(loaded).not.toBeNull();
    expect(loaded.content).toBe('<p>Hello</p>');
    expect(loaded.documentId).toBe('test');
  });

  it('deletes from both stores', async () => {
    await storage.set('penman:draft:del', { content: '<p>x</p>', lastSavedAt: Date.now() });
    await storage.delete('penman:draft:del');
    const result = await storage.get('penman:draft:del');
    expect(result).toBeNull();
  });

  it('handles corrupted localStorage JSON gracefully', async () => {
    localStorage.setItem('penman:draft:corrupt', '{invalid json}}}');
    const result = await storage.get('penman:draft:corrupt');
    expect(result).toBeNull();
    // Corrupted entry should have been removed
    expect(localStorage.getItem('penman:draft:corrupt')).toBeNull();
  });

  it('handles missing localStorage without throwing', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const result = await storage.get('penman:draft:secure');
    expect(result).toBeNull();
    spy.mockRestore();
  });

  it('handles localStorage quota exceeded on set', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    });
    const ok = await storage.set('penman:draft:quota', { content: '<p>x</p>', lastSavedAt: 0 });
    // Should return false, not throw
    expect(ok).toBe(false);
    spy.mockRestore();
  });
});

// ─── DraftManager ─────────────────────────────────────────────────────────────

describe('DraftManager', () => {
  let storage;
  let manager;

  beforeEach(() => {
    localStorage.clear();
    storage = new DraftStorage();
    manager = new DraftManager(storage, 'doc-42', { debounceDelay: 50 });
  });

  afterEach(() => {
    manager.destroy();
    localStorage.clear();
  });

  it('throws on empty documentId', () => {
    expect(() => new DraftManager(storage, '')).toThrow();
    expect(() => new DraftManager(storage, '   ')).toThrow();
    expect(() => new DraftManager(storage, null)).toThrow();
  });

  it('exposes storageKey with correct prefix', () => {
    expect(manager.storageKey).toBe('penman:draft:doc-42');
  });

  it('returns null on load when nothing stored', async () => {
    const result = await manager.load();
    expect(result).toBeNull();
  });

  it('saves and loads content', async () => {
    const html = '<p>This is enough content to save it.</p>';
    await manager.save(html);
    const draft = await manager.load();
    expect(draft).not.toBeNull();
    expect(draft.content).toBe(html);
    expect(draft.documentId).toBe('doc-42');
    expect(typeof draft.lastSavedAt).toBe('number');
  });

  it('skips save for empty content', async () => {
    const ok = await manager.save('');
    expect(ok).toBe(false);
    const draft = await manager.load();
    expect(draft).toBeNull();
  });

  it('skips save for content shorter than minimum', async () => {
    const ok = await manager.save('<p>Hi</p>');
    expect(ok).toBe(false);
  });

  it('skips save when content is unchanged (diff guard)', async () => {
    const html = '<p>This is unchanged content for the test.</p>';
    await manager.save(html);
    const ok2 = await manager.save(html); // identical
    expect(ok2).toBe(false);
  });

  it('saves again when content changes', async () => {
    const html1 = '<p>First version of the content here.</p>';
    const html2 = '<p>Second version of the content here, modified.</p>';
    await manager.save(html1);
    const ok = await manager.save(html2);
    expect(ok).toBe(true);
    const draft = await manager.load();
    expect(draft.content).toBe(html2);
  });

  it('removes the draft', async () => {
    await manager.save('<p>This content is long enough to be saved.</p>');
    await manager.remove();
    const draft = await manager.load();
    expect(draft).toBeNull();
  });

  it('expires drafts older than TTL', async () => {
    const shortTtlManager = new DraftManager(storage, 'doc-ttl', { ttl: 100, debounceDelay: 10 });
    await shortTtlManager.save('<p>This content will expire soon enough.</p>');

    await sleep(150); // wait for TTL to lapse

    const draft = await shortTtlManager.load();
    expect(draft).toBeNull();
    shortTtlManager.destroy();
  });

  it('seedBaseContent prevents a matching save', async () => {
    const html = '<p>Content seeded as the base for comparison.</p>';
    manager.seedBaseContent(html);
    const ok = await manager.save(html);
    expect(ok).toBe(false); // diff guard should stop it
  });

  it('scheduleSave debounces writes', async () => {
    const html = '<p>Debounced save content that is long enough.</p>';
    const saveSpy = vi.spyOn(manager, 'save');

    manager.scheduleSave(html);
    manager.scheduleSave(html);
    manager.scheduleSave(html);

    expect(saveSpy).not.toHaveBeenCalled(); // not yet

    await sleep(100); // past debounce delay of 50ms

    expect(saveSpy).toHaveBeenCalledTimes(1);
    saveSpy.mockRestore();
  });

  it('cancel pending debounce on remove()', async () => {
    const html = '<p>Pending save that should be cancelled.</p>';
    const saveSpy = vi.spyOn(manager, 'save');

    manager.scheduleSave(html);
    await manager.remove(); // should cancel the timer

    await sleep(100);

    // save() should not have been called by the cancelled timer
    expect(saveSpy).not.toHaveBeenCalled();
    saveSpy.mockRestore();
  });

  it('ignores save calls after destroy()', async () => {
    manager.destroy();
    const ok = await manager.save('<p>Content after destroy, should not save.</p>');
    expect(ok).toBe(false);
  });

  it('handles corrupted storage data gracefully', async () => {
    // Write corrupted data directly to localStorage
    localStorage.setItem('penman:draft:doc-42', '{"content": null}');
    const draft = await manager.load();
    expect(draft).toBeNull();
  });
});

// ─── DraftPlugin integration ──────────────────────────────────────────────────

describe('DraftPlugin', () => {
  let editor;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<textarea id="editor"></textarea>';
    editor = new Editor({
      selector: '#editor',
      draftDocumentId: 'integration-test',
    });
    setupDraftPlugin(editor);
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
      editor = null;
    }
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('exposes editor.draft API', () => {
    expect(editor.draft).toBeDefined();
    expect(typeof editor.draft.clear).toBe('function');
    expect(typeof editor.draft.save).toBe('function');
    expect(typeof editor.draft.load).toBe('function');
    expect(typeof editor.draft.getDocumentId).toBe('function');
    expect(typeof editor.draft.getStorageKey).toBe('function');
  });

  it('getDocumentId returns the configured value', () => {
    expect(editor.draft.getDocumentId()).toBe('integration-test');
  });

  it('getStorageKey is correctly namespaced', () => {
    expect(editor.draft.getStorageKey()).toBe('penman:draft:integration-test');
  });

  it('saves draft via editor.draft.save()', async () => {
    editor.setContent('<p>Content that will be saved to the draft store.</p>');
    const ok = await editor.draft.save();
    expect(ok).toBe(true);

    const draft = await editor.draft.load();
    expect(draft).not.toBeNull();
    expect(draft.documentId).toBe('integration-test');
  });

  it('editor.draft.clear() removes the stored draft', async () => {
    editor.setContent('<p>Content that will be cleared from the draft store.</p>');
    await editor.draft.save();
    await editor.draft.clear();
    const draft = await editor.draft.load();
    expect(draft).toBeNull();
  });

  it('shows recovery banner when a newer local draft exists', async () => {
    // Manually write a draft that is newer than the server timestamp
    localStorage.setItem(
      'penman:draft:banner-test',
      JSON.stringify({
        content: '<p>Recovered draft content that is newer than server.</p>',
        lastSavedAt: Date.now() + 10000, // future timestamp
        documentId: 'banner-test',
        title: '',
      })
    );

    document.body.innerHTML = '<textarea id="editor-banner"></textarea>';
    const e2 = new Editor({
      selector: '#editor-banner',
      draftDocumentId: 'banner-test',
      draftServerTimestamp: Date.now() - 1000,
    });
    setupDraftPlugin(e2);

    await sleep(50); // let setTimeout(checkForExistingDraft, 0) run

    const banner = document.querySelector('.penman-draft-banner');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('newer unsaved version');

    e2.destroy();
  });

  it('discard button removes draft and banner', async () => {
    localStorage.setItem(
      'penman:draft:discard-test',
      JSON.stringify({
        content: '<p>This draft should be discardable by the user.</p>',
        lastSavedAt: Date.now() + 5000,
        documentId: 'discard-test',
        title: '',
      })
    );

    document.body.innerHTML = '<textarea id="editor-discard"></textarea>';
    const e3 = new Editor({
      selector: '#editor-discard',
      draftDocumentId: 'discard-test',
    });
    setupDraftPlugin(e3);

    await sleep(50);

    const discardBtn = document.querySelector('.penman-draft-btn-discard');
    expect(discardBtn).not.toBeNull();
    discardBtn.click();

    await sleep(20);

    expect(document.querySelector('.penman-draft-banner')).toBeNull();
    expect(localStorage.getItem('penman:draft:discard-test')).toBeNull();
    e3.destroy();
  });

  it('restore button sets editor content to draft content', async () => {
    const draftContent = '<p>This is the draft content that should be restored.</p>';

    localStorage.setItem(
      'penman:draft:restore-test',
      JSON.stringify({
        content: draftContent,
        lastSavedAt: Date.now() + 5000,
        documentId: 'restore-test',
        title: '',
      })
    );

    document.body.innerHTML = '<textarea id="editor-restore"></textarea>';
    const e4 = new Editor({
      selector: '#editor-restore',
      draftDocumentId: 'restore-test',
    });
    setupDraftPlugin(e4);

    await sleep(50);

    const restoreBtn = document.querySelector('.penman-draft-btn-restore');
    expect(restoreBtn).not.toBeNull();
    restoreBtn.click();

    await sleep(20);

    expect(e4.getContent()).toBe(draftContent);
    expect(document.querySelector('.penman-draft-banner')).toBeNull();
    e4.destroy();
  });

  it('does NOT show banner when server version is newer', async () => {
    const now = Date.now();

    localStorage.setItem(
      'penman:draft:server-newer',
      JSON.stringify({
        content: '<p>Old draft that should not be shown to user.</p>',
        lastSavedAt: now - 5000, // draft is older than server
        documentId: 'server-newer',
        title: '',
      })
    );

    document.body.innerHTML = '<textarea id="editor-sn"></textarea>';
    const e5 = new Editor({
      selector: '#editor-sn',
      draftDocumentId: 'server-newer',
      draftServerContent: '<p>Server is authoritative here.</p>',
      draftServerTimestamp: now, // server is newer than the draft
    });
    setupDraftPlugin(e5);

    await sleep(50);

    expect(document.querySelector('.penman-draft-banner')).toBeNull();
    e5.destroy();
  });

  it('skips recovery when draft content equals current editor content', async () => {
    const initialContent = '<p>Initial text</p>';

    document.body.innerHTML = `<textarea id="editor-same">${initialContent}</textarea>`;
    const e6 = new Editor({ selector: '#editor-same', draftDocumentId: 'same-content' });

    localStorage.setItem(
      'penman:draft:same-content',
      JSON.stringify({
        content: e6.getContent(), // identical to what the editor already shows
        lastSavedAt: Date.now() + 5000,
        documentId: 'same-content',
        title: '',
      })
    );

    setupDraftPlugin(e6);
    await sleep(50);

    expect(document.querySelector('.penman-draft-banner')).toBeNull();
    e6.destroy();
  });

  it('shows recovery banner with Persian date when lang is fa', async () => {
    localStorage.setItem(
      'penman:draft:fa-test',
      JSON.stringify({
        content: '<p>Recovered draft content.</p>',
        lastSavedAt: Date.now(),
        documentId: 'fa-test',
        title: '',
      })
    );

    document.body.innerHTML = '<textarea id="editor-fa"></textarea>';
    const e_fa = new Editor({
      selector: '#editor-fa',
      draftDocumentId: 'fa-test',
      lang: 'fa'
    });
    setupDraftPlugin(e_fa);

    await sleep(50);

    const banner = document.querySelector('.penman-draft-banner');
    expect(banner).not.toBeNull();

    const dateEl = banner.querySelector('.penman-draft-banner-date');
    expect(dateEl).not.toBeNull();
    // Persian digits regex: [\u06F0-\u06F9]
    expect(dateEl.textContent).toMatch(/[\u06F0-\u06F9]/);

    e_fa.destroy();
  });

  it('does not load plugin without a documentId', () => {
    document.body.innerHTML = '<textarea id="editor-noid"></textarea>';
    const e7 = new Editor({ selector: '#editor-noid' }); // no draftDocumentId, no textarea id

    // Remove the id attribute so the fallback also fails
    e7.textarea.removeAttribute('id');

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setupDraftPlugin(e7);

    expect(e7.draft).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No documentId'));
    consoleSpy.mockRestore();
    e7.destroy();
  });
});
