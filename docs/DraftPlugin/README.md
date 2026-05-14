# DraftPlugin

Continuous autosave + recovery. Saves the document on every change to localStorage (small payloads) or IndexedDB (large payloads), and offers a "restore draft" banner the next time the editor loads with the same document id.

## Activate

```js
penman.init({
  selector: '#editor',
  plugins: ['draft'],
  draftDocumentId: 'post-42'   // required: stable id so the draft is unique per document
});
```

## What it registers

| Surface | Name | Notes |
|---|---|---|
| i18n namespace | `plugins.draft` | Banner messages: "Restore draft", "Draft saved", "Draft discarded", etc. |
| Status messages | — | A `pds-saving` / `pds-saved` status appears in the editor footer area while autosave runs. |

The plugin doesn't add a toolbar button — it's silent UX that only surfaces when there's a draft to restore.

## How it works

1. **On init** — looks up `draftDocumentId` in storage. If a draft exists and is newer than the textarea's content, a banner appears:
   > A newer unsaved version of this document was found. **[Restore draft]** **[Discard]**
2. **On change** — debounced ~600ms, the current HTML is serialized to JSON `{ html, lastSavedAt }` and persisted.
3. **Storage routing** — `DraftStorage` chooses IndexedDB for payloads >900 KB and localStorage otherwise. Reads check both stores so size-class changes don't lose drafts. Deletes hit both.

## Options

| Option | Type | Default | Meaning |
|---|---|---|---|
| `draftDocumentId` | `string` | `undefined` | Required. Unique per document; without it, the plugin is a no-op. |

## Storage layer

`DraftStorage` (in `plugins/DraftPlugin/DraftStorage.js`) is exposed as a class. Calls degrade gracefully: every failure path is logged through the shared `logger` and returns `null`/`false` so the editor never crashes when storage is full or unavailable.

## Boundaries

- Does NOT sync across devices (purely client-side storage).
- Does NOT persist after a manual `editor.setContent()` call — that's treated as the canonical new content.
- Does NOT save during an active selection (waits for caret to settle).
