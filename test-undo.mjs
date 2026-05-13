// Simulate HistoryManager semantics without DOM
class FakeHistoryManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.debounceTimeout = null;
    this.debounceDelay = 500;
    this.currentContent = '';
    // Initial state
    this.undoStack.push({ html: this.currentContent });
  }

  _capture() { return { html: this.currentContent }; }

  pushImmediate() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    const snap = this._capture();
    const last = this.undoStack[this.undoStack.length - 1];
    if (last && last.html === snap.html) return;
    this.undoStack.push(snap);
    this.redoStack = [];
  }

  pushDebounced() {
    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => this.pushImmediate(), this.debounceDelay);
  }

  flushPending() {
    if (!this.debounceTimeout) return;
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = null;
    const snap = this._capture();
    const last = this.undoStack[this.undoStack.length - 1];
    if (last && last.html === snap.html) return;
    this.undoStack.push(snap);
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length <= 1) return null;
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
      this.pushImmediate();
    }
    const cur = this.undoStack.pop();
    this.redoStack.push(cur);
    return this.undoStack[this.undoStack.length - 1].html;
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// SCENARIO: User types "hello", then clicks Bold which capitalizes it, then Undo
const h = new FakeHistoryManager();
console.log('Initial undoStack:', h.undoStack.map(s => JSON.stringify(s.html)));

// Type "h", "e", "l", "l", "o" — fast, so single debounce
for (const ch of 'hello') {
  h.currentContent += ch;
  h.pushDebounced();
}
console.log('After typing (debounce pending):', JSON.stringify(h.currentContent), '— stack:', h.undoStack.length);

// User clicks "Capitalize" command (simulating Bold-like action)
// With FIX: flushPending() captures "hello" as its own undo step
h.flushPending();
h.currentContent = 'HELLO';   // command mutates
h.pushImmediate();             // command's snapshot
console.log('After command:', JSON.stringify(h.currentContent), '— stack:', h.undoStack.map(s => JSON.stringify(s.html)));

// First undo — should go from "HELLO" → "hello"
const after1 = h.undo();
console.log('After 1st undo:', JSON.stringify(after1), '(expected: "hello")', after1 === 'hello' ? '✓' : '✗');

// Second undo — should go from "hello" → ""
h.currentContent = after1;
const after2 = h.undo();
console.log('After 2nd undo:', JSON.stringify(after2), '(expected: "")', after2 === '' ? '✓' : '✗');

console.log('');
console.log('── Without the fix (regression scenario) ──');
const h2 = new FakeHistoryManager();
for (const ch of 'hello') {
  h2.currentContent += ch;
  h2.pushDebounced();
}
// WITHOUT flushPending — pushImmediate silently cancels debounce
h2.currentContent = 'HELLO';
h2.pushImmediate();
console.log('Stack:', h2.undoStack.map(s => JSON.stringify(s.html)));
const u1 = h2.undo();
console.log('1st undo →', JSON.stringify(u1), '(WITHOUT fix this jumps past "hello" to "")');
