export default {
  _dir: 'ltr',

  // Toolbar buttons and plugins
  plugins: {
    format: 'Format',
    image: {
      title: 'Image',
      insert: 'Insert Image',
      urlTab: 'Direct URL',
      uploadTab: 'Upload',
      galleryTab: 'Gallery',
      cancel: 'Cancel',
      upload: 'Upload',
      uploadPlaceholder: 'Drop images here or click to select',
      insertSelected: 'Insert Selected',
      clearQueue: 'Clear Queue',
      urlPlaceholder: 'https://...',
      altPlaceholder: 'Alternative text (optional)',
      insertUrl: 'Insert from URL',
      galleryEmpty: 'No images found in gallery.',
      galleryError: 'Error loading gallery: {error}'
    },
    blockType: {
      paragraph: 'Paragraph',
      heading1: 'Heading 1',
      heading2: 'Heading 2',
      heading3: 'Heading 3',
      heading4: 'Heading 4',
      heading5: 'Heading 5',
      heading6: 'Heading 6',
      blockquote: 'Blockquote',
      pre: 'Preformatted'
    },
    media: {
      title: 'Insert Media',
      directTab: 'Direct Link',
      embedTab: 'Embed Code',
      directPlaceholder: 'Enter video/audio URL (mp4, webm, mp3...)',
      embedPlaceholder: 'Enter URL (YouTube, Vimeo...)',
      insert: 'Insert',
      cancel: 'Cancel',
      autoplay: 'Autoplay',
      controls: 'Controls',
      posterPlaceholder: 'Poster image URL (optional)'
    },
    suggestedPosts: {
      title: 'Suggested posts',
      searchPlaceholder: 'Search posts...',
      insert: 'Insert Selected',
      cancel: 'Cancel',
      noResults: 'No posts found.',
      loading: 'Loading...'
    },
    fontSize: {
      title: 'Size'
    },
    sourceCode: {
      title: 'Source Code',
      apply: 'Apply Changes',
      cancel: 'Cancel'
    },
    direction: {
      rtl: 'RTL',
      ltr: 'LTR',
      auto: 'Dir Auto'
    },
    list: {
      bullet: 'Bullet List',
      numbered: 'Numbered List'
    },
    hr: {
      title: 'Insert Horizontal Rule'
    },
    removeFormat: {
      title: 'Clear Formatting'
    },
    findReplace: {
      title: 'Find and Replace',
      find: 'Find',
      replace: 'Replace',
      replaceAll: 'Replace all',
      next: 'Next',
      prev: 'Previous',
      findPlaceholder: 'Find text...',
      replacePlaceholder: 'Replace with...',
      matchCase: 'Match case',
      noMatch: 'No matches found.'
    },
    link: {
      insert: 'Insert Link',
      unlink: 'Unlink',
      urlPlaceholder: 'URL (e.g. https://example.com)',
      textPlaceholder: 'Text to display',
      openInNewTab: 'Open in new tab',
      save: 'Save',
      cancel: 'Cancel'
    },
    color: {
      textColor: 'Text Color',
      highlight: 'Highlight',
      clear: 'Clear Color'
    },
    table: {
      title: 'Table',
      insertRowAbove: 'Insert Row Above',
      insertRowBelow: 'Insert Row Below',
      insertColLeft: 'Insert Column Left',
      insertColRight: 'Insert Column Right',
      deleteRow: 'Delete Row',
      deleteCol: 'Delete Column',
      deleteTable: 'Delete Table'
    }
  },

  // General commands / core
  core: {
    undo: 'Undo',
    redo: 'Redo',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    strikethrough: 'Strikethrough',
    justifyLeft: 'Align Left',
    justifyCenter: 'Align Center',
    justifyRight: 'Align Right',
    justifyFull: 'Justify'
  },

  // UI Elements
  ui: {
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    insert: 'Insert',
    delete: 'Delete',
    edit: 'Edit',
    ok: 'OK'
  }
};
