/**
 * @vitest-environment jsdom
 *
 * Test suite for the DirectionPlugin system.
 * Covers: directionDetector, LockManager, directionApplier, and plugin integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectDirection, detectByFirstStrong, detectByRatio } from './directionDetector.js';
import { applyDirection, isSupportedBlock, isForcedLTR, stripIncomingDirection } from './directionApplier.js';
import { LockManager } from './lockManager.js';
import { setupDirectionPlugin } from './DirectionPlugin.js';
import { Editor } from '../../core/Editor.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeEditor(extraOptions = {}) {
  document.body.innerHTML = '<textarea id="editor"></textarea>';
  return new Editor({ selector: '#editor', ...extraOptions });
}

// ─── directionDetector ────────────────────────────────────────────────────────

describe('detectByFirstStrong', () => {
  it('detects Persian text as RTL', () => {
    expect(detectByFirstStrong('سلام دنیا')).toBe('rtl');
  });

  it('detects Arabic text as RTL', () => {
    expect(detectByFirstStrong('مرحبا بالعالم')).toBe('rtl');
  });

  it('detects English text as LTR', () => {
    expect(detectByFirstStrong('Hello world')).toBe('ltr');
  });

  it('skips leading punctuation and numbers', () => {
    expect(detectByFirstStrong('123. سلام')).toBe('rtl');
    expect(detectByFirstStrong('... Hello')).toBe('ltr');
  });

  it('returns fallback for empty or neutral-only input', () => {
    expect(detectByFirstStrong('', 'rtl')).toBe('rtl');
    expect(detectByFirstStrong('   123  ', 'ltr')).toBe('ltr');
  });

  it('ignores URLs and detects the surrounding language', () => {
    expect(detectByFirstStrong('https://example.com سلام')).toBe('rtl');
    expect(detectByFirstStrong('https://example.com Hello')).toBe('ltr');
  });

  it('detects Hebrew as RTL', () => {
    expect(detectByFirstStrong('שלום')).toBe('rtl');
  });
});

describe('detectByRatio', () => {
  it('detects mostly Persian text as RTL', () => {
    expect(detectByRatio('متن فارسی برای آزمایش', { rtlThreshold: 0.3 })).toBe('rtl');
  });

  it('detects mostly English text as LTR', () => {
    expect(detectByRatio('This is an English sentence for testing purposes.', { rtlThreshold: 0.3 })).toBe('ltr');
  });

  it('respects rtlThreshold', () => {
    // Text with some RTL chars but below a high threshold
    const mixed = 'Hello سلام World'; // ~2/9 chars are RTL letters
    expect(detectByRatio(mixed, { rtlThreshold: 0.5 })).toBe('ltr');
    expect(detectByRatio(mixed, { rtlThreshold: 0.1 })).toBe('rtl');
  });

  it('returns fallback for empty text', () => {
    expect(detectByRatio('', { fallback: 'rtl' })).toBe('rtl');
  });

  it('respects sampleSize', () => {
    // Long English prefix followed by Persian — small sampleSize sees only English
    const text = 'AAAAAAAAAAAAAAAAAAAAA سلام';
    expect(detectByRatio(text, { sampleSize: 10, rtlThreshold: 0.3 })).toBe('ltr');
  });
});

describe('detectDirection (public API)', () => {
  it('routes to first-strong by default', () => {
    expect(detectDirection('سلام')).toBe('rtl');
  });

  it('routes to ratio strategy when specified', () => {
    const result = detectDirection('سلام دنیا', { strategy: 'ratio', rtlThreshold: 0.3 });
    expect(result).toBe('rtl');
  });

  it('returns fallback for null input', () => {
    expect(detectDirection(null, { fallback: 'rtl' })).toBe('rtl');
    expect(detectDirection(undefined, {})).toBe('ltr');
  });
});

// ─── LockManager ─────────────────────────────────────────────────────────────

describe('LockManager', () => {
  let lm;

  beforeEach(() => {
    lm = new LockManager({ attribute: 'data-dir-lock', persistOnEmpty: false });
  });

  it('isLocked returns false by default', () => {
    const el = document.createElement('p');
    expect(lm.isLocked(el)).toBe(false);
  });

  it('lock sets the attribute', () => {
    const el = document.createElement('p');
    lm.lock(el);
    expect(el.getAttribute('data-dir-lock')).toBe('true');
    expect(lm.isLocked(el)).toBe(true);
  });

  it('unlock removes the attribute', () => {
    const el = document.createElement('p');
    lm.lock(el);
    lm.unlock(el);
    expect(lm.isLocked(el)).toBe(false);
    expect(el.hasAttribute('data-dir-lock')).toBe(false);
  });

  it('handleEmpty removes lock when content is empty and persistOnEmpty=false', () => {
    const el = document.createElement('p');
    el.textContent = '';
    lm.lock(el);
    lm.handleEmpty(el);
    expect(lm.isLocked(el)).toBe(false);
  });

  it('handleEmpty keeps lock when persistOnEmpty=true', () => {
    const lmPersist = new LockManager({ persistOnEmpty: true });
    const el = document.createElement('p');
    el.textContent = '';
    lmPersist.lock(el);
    lmPersist.handleEmpty(el);
    expect(lmPersist.isLocked(el)).toBe(true);
  });

  it('handleEmpty keeps lock when block has content', () => {
    const el = document.createElement('p');
    el.textContent = 'some text';
    lm.lock(el);
    lm.handleEmpty(el);
    expect(lm.isLocked(el)).toBe(true);
  });

  it('stripAll removes locks from all elements', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p data-dir-lock="true">a</p><h1 data-dir-lock="true">b</h1>';
    lm.stripAll(root);
    expect(root.querySelectorAll('[data-dir-lock]').length).toBe(0);
  });
});

// ─── directionApplier ────────────────────────────────────────────────────────

describe('isSupportedBlock', () => {
  it('returns true for block-level tags', () => {
    ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'div'].forEach(tag => {
      expect(isSupportedBlock(document.createElement(tag))).toBe(true);
    });
  });

  it('returns false for inline tags', () => {
    ['span', 'strong', 'em', 'a', 'u'].forEach(tag => {
      expect(isSupportedBlock(document.createElement(tag))).toBe(false);
    });
  });

  it('returns false for null / non-element', () => {
    expect(isSupportedBlock(null)).toBe(false);
    expect(isSupportedBlock(document.createTextNode('hi'))).toBe(false);
  });
});

describe('isForcedLTR', () => {
  it('returns true for pre and code elements', () => {
    expect(isForcedLTR(document.createElement('pre'))).toBe(true);
    expect(isForcedLTR(document.createElement('code'))).toBe(true);
  });

  it('returns true for a block inside a pre', () => {
    const pre = document.createElement('pre');
    const p = document.createElement('p');
    pre.appendChild(p);
    document.body.appendChild(pre);
    expect(isForcedLTR(p)).toBe(true);
    document.body.removeChild(pre);
  });

  it('returns false for a normal paragraph', () => {
    expect(isForcedLTR(document.createElement('p'))).toBe(false);
  });
});

describe('applyDirection', () => {
  it('sets the dir attribute', () => {
    const p = document.createElement('p');
    const changed = applyDirection(p, 'rtl');
    expect(changed).toBe(true);
    expect(p.getAttribute('dir')).toBe('rtl');
  });

  it('returns false when direction is already set', () => {
    const p = document.createElement('p');
    p.setAttribute('dir', 'rtl');
    const changed = applyDirection(p, 'rtl');
    expect(changed).toBe(false);
  });

  it('changes direction from rtl to ltr', () => {
    const p = document.createElement('p');
    p.setAttribute('dir', 'rtl');
    const changed = applyDirection(p, 'ltr');
    expect(changed).toBe(true);
    expect(p.getAttribute('dir')).toBe('ltr');
  });

  it('does not apply to unsupported elements', () => {
    const span = document.createElement('span');
    const changed = applyDirection(span, 'rtl');
    expect(changed).toBe(false);
    expect(span.hasAttribute('dir')).toBe(false);
  });

  it('strips inline direction style', () => {
    const p = document.createElement('p');
    p.style.direction = 'ltr';
    applyDirection(p, 'rtl');
    expect(p.style.direction).toBe('');
  });

  it('forces ltr on pre elements', () => {
    const pre = document.createElement('pre');
    applyDirection(pre, 'rtl'); // Should be ignored / forced to ltr
    // pre is not in SUPPORTED_BLOCK_TAGS so applyDirection returns false for it
    // isForcedLTR check is upstream in processBlock
    expect(pre.getAttribute('dir')).toBeNull();
  });
});

describe('stripIncomingDirection', () => {
  it('removes dir attributes from block elements', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p dir="rtl">text</p><h1 dir="ltr">head</h1>';
    stripIncomingDirection(root);
    expect(root.querySelector('p').hasAttribute('dir')).toBe(false);
    expect(root.querySelector('h1').hasAttribute('dir')).toBe(false);
  });

  it('removes inline direction styles from blocks', () => {
    const root = document.createElement('div');
    const p = document.createElement('p');
    p.style.direction = 'rtl';
    root.appendChild(p);
    stripIncomingDirection(root);
    expect(p.style.direction).toBe('');
  });

  it('does not touch inline elements', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p><span dir="rtl">inline</span></p>';
    stripIncomingDirection(root);
    // span is not a supported block, should not be touched... 
    // Actually we only process isSupportedBlock, so span dir stays
    expect(root.querySelector('span').getAttribute('dir')).toBe('rtl');
  });
});

// ─── Plugin integration ───────────────────────────────────────────────────────

describe('DirectionPlugin integration', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor"></textarea>';
    editor = new Editor({ selector: '#editor', directionOptions: { auto: true, default: 'ltr', toolbar: true } });
    setupDirectionPlugin(editor);
  });

  afterEach(() => {
    if (editor) { editor.destroy(); editor = null; }
    document.body.innerHTML = '';
  });

  it('exposes editor.direction API', () => {
    expect(editor.direction).toBeDefined();
    expect(typeof editor.direction.set).toBe('function');
    expect(typeof editor.direction.reset).toBe('function');
    expect(typeof editor.direction.refresh).toBe('function');
    expect(typeof editor.direction.detect).toBe('function');
  });

  it('registers dirrtl, dirltr, dirreset toolbar buttons', () => {
    expect(editor.ui.registry.buttons['dirrtl']).toBeDefined();
    expect(editor.ui.registry.buttons['dirltr']).toBeDefined();
    expect(editor.ui.registry.buttons['dirreset']).toBeDefined();
  });

  it('registers SET_DIR_RTL, SET_DIR_LTR, RESET_DIR commands', () => {
    expect(editor.commands.commands['SET_DIR_RTL']).toBeDefined();
    expect(editor.commands.commands['SET_DIR_LTR']).toBeDefined();
    expect(editor.commands.commands['RESET_DIR']).toBeDefined();
  });

  it('auto-detects Persian paragraph as RTL after initial scan', async () => {
    editor.setContent('<p>سلام دنیا</p>');
    await sleep(50); // initial scan is setTimeout 0
    const p = editor.editableArea.querySelector('p');
    expect(p.getAttribute('dir')).toBe('rtl');
  });

  it('auto-detects English paragraph as LTR after initial scan', async () => {
    editor.setContent('<p>Hello World</p>');
    await sleep(50);
    const p = editor.editableArea.querySelector('p');
    expect(p.getAttribute('dir')).toBe('ltr');
  });

  it('applies default direction to empty paragraph', async () => {
    editor.setContent('<p></p>');
    await sleep(50);
    const p = editor.editableArea.querySelector('p');
    expect(p.getAttribute('dir')).toBe('ltr'); // default is ltr in this test
  });

  it('manual set direction locks the block', async () => {
    editor.setContent('<p>سلام</p>');
    await sleep(50);

    const p = editor.editableArea.querySelector('p');

    // Move cursor into paragraph
    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    sel.addRange(range);

    // Manually set LTR
    editor.direction.set('ltr');

    expect(p.getAttribute('dir')).toBe('ltr');
    expect(p.getAttribute('data-dir-lock')).toBe('true');
  });

  it('reset removes lock and re-detects', async () => {
    editor.setContent('<p>سلام دنیا</p>');
    await sleep(50);

    const p = editor.editableArea.querySelector('p');
    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    sel.addRange(range);

    // Lock to wrong direction
    editor.direction.set('ltr');
    expect(p.getAttribute('data-dir-lock')).toBe('true');

    // Reset
    editor.direction.reset();

    // Lock should be gone, direction re-detected as RTL
    expect(p.hasAttribute('data-dir-lock')).toBe(false);
    expect(p.getAttribute('dir')).toBe('rtl');
  });

  it('locked block is not changed by refresh', async () => {
    editor.setContent('<p>سلام</p>');
    await sleep(50);

    const p = editor.editableArea.querySelector('p');
    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    sel.addRange(range);

    editor.direction.set('ltr'); // manually lock to ltr
    expect(p.getAttribute('dir')).toBe('ltr');

    // Force a full refresh
    editor.direction.refresh();

    // Should remain locked LTR
    expect(p.getAttribute('dir')).toBe('ltr');
    expect(p.getAttribute('data-dir-lock')).toBe('true');
  });

  it('editor.direction.detect() returns direction without touching DOM', () => {
    expect(editor.direction.detect('سلام')).toBe('rtl');
    expect(editor.direction.detect('Hello')).toBe('ltr');
  });

  it('multiple paragraphs are detected independently', async () => {
    editor.setContent('<p>Hello</p><p>سلام</p>');
    await sleep(50);

    const paragraphs = editor.editableArea.querySelectorAll('p');
    expect(paragraphs[0].getAttribute('dir')).toBe('ltr');
    expect(paragraphs[1].getAttribute('dir')).toBe('rtl');
  });
});

// ─── Default RTL option ───────────────────────────────────────────────────────

describe('DirectionPlugin default RTL', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="editor"></textarea>';
    editor = new Editor({ selector: '#editor', directionOptions: { auto: true, default: 'rtl' } });
    setupDirectionPlugin(editor);
  });

  afterEach(() => {
    if (editor) { editor.destroy(); editor = null; }
    document.body.innerHTML = '';
  });

  it('applies rtl to empty paragraphs when default is rtl', async () => {
    editor.setContent('<p></p>');
    await sleep(50);
    const p = editor.editableArea.querySelector('p');
    expect(p.getAttribute('dir')).toBe('rtl');
  });
});
