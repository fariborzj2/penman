# Penman Image Plugin – Hardened Implementation Specification (Bug-Proof Execution Law)

## 1. Overview

This document is a hardened, implementation-grade specification for the Image Plugin system in the Penman Editor.

This version establishes a "Bug-Proof Execution Law" with zero-interpretation rules. It guarantees deterministic behavior by locking the semantic state machine, event emission races, semantic selection validity, and temporal DOM consistency.

The system is designed for a Vanilla JS DOM-based editor with command-driven architecture and UI registry separation.

---

## 2. Functional Requirements (HARDENED)

### 2.1 Core Image Features

#### INSERT IMAGE FROM URL
- **Input:** `{ url: string, alt?: string }`
- **Validation:**
  - URL must match regex `^(https?|data:image\/[a-zA-Z+]+;base64,).*`
  - URL length must not exceed 2048 characters.
  - Must pass sanitization rules defined in Section 8.
- **Behavior:**
  - Command executes synchronously.
  - If valid: Create image node (Section 4.1) and insert based on Semantic Selection Model (Section 4.4).
  - If invalid: Command fails synchronously, throws `Error('INVALID_URL')`, and propagates to the UI module.

---

#### UPLOAD IMAGE FROM DEVICE (Deterministic Lifecycle)
- **Input:** `File` object or `File[]`
- **Validation:**
  - Allowed MIME types: `image/png`, `image/jpeg`, `image/webp`.
  - Max size: `5MB` (configurable).
- **Behavior & Conflict Resolution:**
  1. **Snapshot Locked:** Capture `editor.selection.save()` instantly.
  2. **Placeholder Insertion (Order Guaranteed):** Files enter `PENDING`. Placeholders are immediately generated and inserted at the semantically resolved selection point.
     - *Rule:* Multiple files are inserted sequentially. Order of DOM insertion strictly matches the Array index.
  3. **Execution:** Upload executes asynchronously.
  4. **State Mutation:**
     - On `SUCCESS`: Target by unique `data-id`. See Section 7.2 for atomic mutation rules.
     - On `FAILED`: Target by `data-id`. See Section 7.2 for atomic mutation rules.

---

#### PASTE IMAGE
- **Trigger:** DOM `paste` event.
- **Rules:**
  - Intercept `paste` before default behavior.
  - If `clipboardData.files` contains valid images: Route to Upload Pipeline (Concurrency max: 3).
  - If `clipboardData.getData('text/html')` contains `<img>`: Extract `src`, validate, insert as URL. Drop invalid tags.

---

#### DRAG & DROP IMAGE
- **Trigger:** DOM `drop` event within editor container.
- **Rules:**
  - Intercept `drop`. Prevent default browser behavior unconditionally.
  - If `dataTransfer.files` contains valid images: Route to Upload Pipeline. Drop non-images silently.

---

## 3. GALLERY SYSTEM (STRICT CONTRACT)

### 3.1 Gallery Source Contract

#### Lifecycle State
- `REGISTERED` → `READY` → `ERROR` | `DISABLED`

#### Required Methods
- `list(cursor: string | null, limit: number) -> Promise<GalleryListResponse>`
- `get(id: string) -> Promise<ImageItem>`
- `auth?() -> Promise<AuthState>`

#### Schema & Trust Immutability
```json
{
  "id": "string",
  "url": "string",
  "thumbnailUrl": "string",
  "title": "string | null",
  "width": number,
  "height": number,
  "sourceId": "string",
  "trustLevel": "TRUSTED | UNTRUSTED"
}
```
- **Trust Immutability Rule:** `trustLevel` is explicitly defined at `PluginManager` registration time. An `ImageItem` inherits its source's trust. Trust CANNOT be mutated at runtime by API payloads, cached items, or updates.

---

## 4. IMAGE RENDERING, SELECTION & EDITING BEHAVIOR

### 4.1 DOM Structure (MANDATORY)

```html
<figure class="penman-image" data-alignment="center" contenteditable="false">
  <div class="penman-image-wrapper">
    <img src="..." alt="..." data-id="..." />
  </div>
  <figcaption class="penman-image-caption" contenteditable="true" data-placeholder="Enter caption...">Optional Caption</figcaption>
</figure>
```

### 4.2 Alignment System (Consistent Source of Truth)
- **Source of Truth:** The `data-alignment` attribute on `figure`.
- **Sync Rule:** CSS classes (`.penman-align-center`) are deterministic derivatives. Any drift detected via MutationObserver forces the class to reset based on the data attribute.

### 4.3 Caption Behavior (Consistent Editing Model)
- **Content Model:** strictly limited to text and inline tags (`b`, `i`, `u`, `a`).
- **Paste Event:** Pasting HTML strips block tags (`div`, `p`, `img`) converting them to whitespace.
- **Enter Key:** Pressing ENTER inside caption prevents default (no new lines). It triggers `blur()` on the caption and moves the cursor to a new `<p><br></p>` block appended immediately after the `figure`.

### 4.4 Semantic Selection & Insertion Model
When determining where to insert an image, strict priority applies. Selection must be Spatial, Semantic, and Temporal valid.

1. **Priority 1: Active Saved Marker.** If `editor.selection.save()` was called explicitly.
2. **Priority 2: Live Selection.** Active browser selection.
3. **Priority 3: Fallback.** Append a new `<p><br></p>` containing the `figure` to the absolute end of the primary `.penman-editor-area` root.

**The Absolute Validity Execution Law:**
Before applying Priority 1 or 2, the selection MUST pass ALL three checks:
- **Spatial Check:** Node must exist and be contained within `.penman-editor-area`.
- **Semantic Check:** The node or its closest block parent MUST NOT be `contenteditable="false"` (e.g., another `figure` or table wrapper), UNLESS it is the `figcaption` itself.
- **Temporal Check (The Stability Lock):** The DOM must be in a stable state. The selection is INVALID if there are pending MutationObserver microtasks on the target node, or if the node is actively being detached/reflowed.
- If ANY check fails, the selection is instantly declared INVALID and execution drops immediately to Priority 3.
- **Caption Escape Rule:** If the valid resolved node is inside a `figcaption`, escape it by shifting the insertion point to *after* the parent `figure` node.

---

## 5. UI SPECIFICATION
- **Modal:** Upload (Drag/Drop, File input), URL input, Gallery grid.
- **Floating Controls:** Rendered via generic ContextMenu logic on `figure` click (Align Left/Center/Right, Delete).

---

## 6. HISTORY MANAGER: CONCURRENCY & ORDERING CONTRACT

### 6.1 Uploading Snapshot Exemption
- The insertion of the `PENDING/UPLOADING` placeholder MUST NOT trigger a history snapshot.

### 6.2 The Completion Snapshot (Concurrency Resolved)
- A history snapshot is captured ONLY at the exact millisecond an upload transitions to `SUCCESS` and mutates the DOM.
- **Concurrency Rule:** History Order = Completion Order. Snapshots are triggered *per file completion*.
- **Edge Case Lock:** If the placeholder is deleted before the upload finishes, the async handler aborts state application, and NO history snapshot is fired.

### 6.3 Standard Operations
- `INSERT_IMAGE` (URL/Gallery), Deletion, and Alignment changes each trigger exactly ONE atomic snapshot.
- Caption changes trigger a snapshot only on `blur`, not per keystroke.

---

## 7. ERROR SYSTEM & EVENT ATOMICITY

### 7.1 Async vs Sync Propagation
- **Sync Errors:** Command throws `Error` immediately. UI catches via `try/catch`.
- **Async Errors:** Propagated via internal Emitter (`editor.emit()`).

### 7.2 The Atomic Event-Mutation Law (Race Boundary Lock)
To eliminate race conditions between DOM deletion, state mutation, and event emission during an async upload lifecycle:

1. **Pre-Emission Live Check:** At the exact moment `SUCCESS` or `FAILED` is reached, the async handler MUST execute a live `document.querySelector('[data-id="..."]')` check.
2. **Atomic Execution Block:** If the node is found, the system MUST execute the following synchronously in a single execution frame:
   - Mutate the DOM state (update `src` or render error UI).
   - Trigger the History snapshot (if `SUCCESS`).
   - Emit the lifecycle event (`image:uploadSuccess` or `image:uploadError`).
3. **The Absolute Drop Rule:** If the live query in Step 1 returns `null` (the node was deleted), the entire atomic block is skipped. State mutation is aborted, History is bypassed, and the event is **DROPPED entirely**.

### 7.3 Format
```json
{
  "code": "UPLOAD_FAILED | INVALID_URL | GALLERY_ERROR | FILE_TOO_LARGE | INVALID_TYPE",
  "message": "string",
  "context": { "dataId": "...", "sourceId": "..." },
  "retryable": boolean
}
```

---

## 8. SECURITY & SANITIZATION (ENFORCEABLE RULES)

### 8.1 Trust Boundary Enforcement Rule
- The absolute security enforcement boundary is the **`INSERT_IMAGE` command execution time**.
- Before a `figure` node is created and appended to the DOM, the `src` URL MUST be evaluated against its `trustLevel`.
- If `trustLevel === UNTRUSTED` (or if inserted via raw URL tab), strict regex validation and scheme whitelisting occur. If it fails, execution is aborted synchronously.

### 8.2 DOM Safety Rules
- `innerHTML` MUST NOT be used to construct the `figure` node under any circumstance.
- Nodes must be created using `document.createElement()` and attributes set via `setAttribute()`.
