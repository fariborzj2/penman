# 1. Overview

**Penman** is a framework-agnostic vanilla-JS rich text editor (WYSIWYG). It targets developers who want a small, predictable, plugin-extensible editor that drops in over a `<textarea>` and works the same way on every page.

## Design goals

| Goal | How it's delivered |
|---|---|
| **Zero framework coupling** | No imports of React / Vue / Angular. The bundle is a single UMD or ESM module. CSS is auto-injected from the JS, so a single `<script>` tag is enough. |
| **Modular plugins** | Every feature beyond the core editing surface lives in `src/plugins/<Name>/` as a self-contained folder. Removing the folder removes the plugin entirely. |
| **Strict sanitization** | All HTML round-trips (paste, `setContent`, source view) pass through `src/sanitization/Sanitizer.js`, an allowlist-driven sanitizer. URL schemes are validated independently in `src/utils/html.js` (`safeUrl`). |
| **First-class RTL / Persian** | `direction: 'auto'` enables per-block detection. Persian, Arabic, Hebrew character ranges drive a first-strong heuristic; user-overridden blocks are locked. Vazirmatn font family is bundled. |
| **Dark mode** | One source of truth via CSS variables (`--pm-*` for chrome, `--pmc-*` for content). Activated by `data-theme="dark"` on the wrapper or `<html>`, with `prefers-color-scheme` fallback. `editor.setTheme()` flips at runtime. |
| **Two distribution modes** | npm (`import penman from 'penman-editor'`) for app integrators and bundlers; CDN (`<script src="https://cdn.jsdelivr.net/npm/penman-editor">`) for plain HTML pages — both ship the same code with CSS inlined. |

## What's bundled

Twenty-one plugins covering: inline formatting, headings + block types, font size, lists, links, images (with gallery + upload), media embeds (YouTube / Vimeo / Aparat / direct video / audio), iframe embeds, tables (merge / split / properties), code blocks, source view, find/replace (RTL-aware), markdown shortcuts, content audit (SEO/a11y/readability rules), drafts (autosave to IndexedDB/localStorage), color (text + highlight), direction (RTL/LTR/auto), suggested posts, horizontal rule, remove format, and a help dialog.

See the [docs index](README.md) for one-liners + links to each plugin's README.

## Typical use cases

- CMS post editor with a backend `imageUploadFn` for uploads.
- Persian-language editorial workflows (built-in RTL, ZWNJ-aware text).
- Comment / forum editors where strict sanitization matters more than feature breadth (use a slim plugin list).
- Documentation / knowledge-base editors that benefit from Markdown shortcuts and the audit plugin's accessibility checks.

## What's intentionally out of scope

- **Collaborative editing.** Penman is single-user. Real-time collaboration requires an operational-transform layer that doesn't exist (see the IR architecture note in [`08-roadmap-and-limits.md`](08-roadmap-and-limits.md)).
- **Mobile-first touch optimization.** Toolbars target ≥40px hit areas but the editor assumes a desktop / tablet experience.
- **Server-side rendering of editor output.** The editor's `<style>` injection happens at runtime; SSR consumers should preload `src/styles/penman-content.css` for the content area.
