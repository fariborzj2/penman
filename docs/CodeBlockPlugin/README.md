# CodeBlock Plugin

Provides a highly stable, high-performance code block editing experience for the Penman editor.

## Overview
This plugin delivers a real-time, lag-free syntax highlighting experience strictly using native JavaScript and regular expressions. It introduces a custom Regex-based tokenizer and an incremental DOM patching engine, guaranteeing that text typing, cursor navigation, and operations like undo/redo remain uninterrupted and instantaneous, even on large code blocks.

## Core Features
- **Real-Time Highlighting**: Syntax highlighting for JavaScript via a native, lightning-fast Regex tokenizer. No external libraries are used.
- **Incremental Patching**: The rendering pipeline uses a diff-and-patch approach, modifying only the necessary text nodes and spans instead of trashing and rewriting innerHTML. This limits re-rendering to absolute minimums (< 8ms per keystroke).
- **Absolute Cursor Stability**: Cursor position is calculated by absolute text length offsets, making it fully decoupled from the DOM nodes that represent tokens.
- **IDE Features**:
  - Auto-indentation on `Enter`.
  - Double space insertion on `Tab`.
  - Automatic code formatting when pasting single-line compact code.
- **Pure Text State**: The DOM is treated strictly as a rendering projection. The source of truth is always plain text.
- **Robust Edge Cases**: Fully supports pasting raw text directly into the code block and seamlessly manages rapid mid-token edits.
