# 20 - Source Code Modal Plugin Specification

## 1. Overview
The `SourceCodePlugin` allows users to view and edit the raw HTML/source code of the editor content within a professional, fast, and bug-free modal.

## 2. Modal UI
- **Type**: Centered modal with backdrop (using `editor.ui.createModal`).
- **Triggers**:
  - Toolbar button (name: `sourcecode`, icon: `<svg>...</svg>`).
  - Keyboard shortcut: `Ctrl + Shift + S`.
- **Structure**:
  - **Header**: Title ("Source Code") + Close button.
  - **Body**: Professional Code Editor (CodeMirror) + Search Bar at the top.
  - **Footer**: `Save` and `Cancel` buttons.

## 3. Code Editor
- **Library**: CodeMirror 6.
- **Features**: Syntax highlighting for HTML, Line numbers, Auto-indent.
- **RTL & Persian Editing (Critical)**:
  - Direction must always be `rtl` (`direction: rtl`).
  - No cursor jumps, accurate positioning.
  - Proper selection with mouse and keyboard.
  - Full support for mixed text (Persian + English).
  - Character integrity on copy/paste.

## 4. Search & Navigation
- **UI**: Search input above the code editor, with `Next` and `Previous` buttons.
- **Features**: Live search, highlight results. (Leveraging `@codemirror/search`).

## 5. Data Flow
- **On Open**: Fetch `editor.getContent()` and load it into the code editor.
- **On Save**:
  - Pass content to `editor.sanitizer.sanitize()` to ensure it's clean and structurally valid.
  - Apply changes without refresh by replacing the editor's innerHTML safely.
  - Push history state to maintain undo/redo.
- **On Cancel/Close**:
  - Discard changes.
  - If there are unsaved changes (dirty state), display a confirmation warning before closing.

## 6. Sanitization & Security
- Uses the existing `editor.sanitizer.sanitize(html)` to prevent XSS and script injection.
- Preserves allowed attributes and styles according to Penman's schema.

## 7. Performance & Extensibility
- Virtualization and lazy rendering via CodeMirror.
- Responsive design for small viewports.
- Support for dark/light mode via CodeMirror themes.

## 8. Modifications to Core
- `Modal.js` will be slightly updated so `onCancel` can return `false` to prevent the modal from closing, allowing the "unsaved changes" warning to work correctly.
