// src/plugins/HelpPlugin/lang/en.js
// English strings for HelpPlugin. Registered under namespace "plugins.help".
export default {
  title: 'Help & Shortcuts',
  buttonLabel: 'Help',

  // Section titles
  sections: {
    shortcuts: 'Keyboard Shortcuts',
    markdown:  'Markdown Shortcuts',
    tips:      'Tips',
    about:     'About'
  },

  // Column headers
  columns: {
    keys:        'Keys',
    action:      'Action',
    type:        'Type',
    description: 'Description'
  },

  // Keyboard shortcuts (label shown next to the keys)
  shortcuts: {
    bold:          'Bold',
    italic:        'Italic',
    underline:     'Underline',
    undo:          'Undo',
    redo:          'Redo',
    findReplace:   'Find & Replace',
    sourceCode:    'Toggle source code view',
    breakout:      'Exit current block (heading / blockquote / etc.)',
    indentList:    'Indent list item',
    outdentList:   'Outdent list item',
    openHelp:      'Open this help dialog'
  },

  // Markdown auto-conversions
  markdown: {
    h1:      'Heading 1',
    h2:      'Heading 2',
    h3:      'Heading 3',
    bullet:  'Bullet list',
    ordered: 'Numbered list',
    quote:   'Blockquote',
    code:    'Inline code',
    bold:    'Bold',
    italic:  'Italic',
    hr:      'Horizontal rule'
  },

  // Usage tips shown as a list
  tips: {
    images:      'Click the image button to add a picture by URL, upload, or pick from the gallery.',
    links:       'Select text, then click the link button (or press Ctrl/Cmd+K) to insert a link.',
    tables:      'Use the table dropdown to insert a table; right-click cells to merge, split, or change properties.',
    direction:   'Switch document direction (RTL / LTR) from the toolbar — useful for mixed-language writing.',
    paste:       'Paste plain text or HTML directly — the editor sanitizes unsafe content automatically.',
    autosave:    'If drafts are enabled, your work is saved continuously so you can come back later.',
    fullscreen:  'Use the source-code view to edit raw HTML when you need fine control.'
  },

  about: {
    name:        'Penman Editor',
    description: 'A framework-agnostic, zero-dependency rich-text editor.',
    version:     'Version',
    license:     'License'
  }
};
